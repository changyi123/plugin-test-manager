import parallelLimit from 'async/parallelLimit';
import dayjs from 'dayjs';
import { t } from 'i18next';
import { cloneDeep, last, omit, uniq, uniqBy } from 'lodash';

import {
  getLinkedTestEntityByQuery,
  getRelativeAllItem,
  getRelativeItem,
  getTestEntityByQuery,
} from '@/lib/api/item';
import { featureFlags, SupportFeatureFlags } from '@/lib/appEnv';
import {
  ExtendReportType,
  TestExecutionModel,
  TestFiledKeyMapping,
  TestLinkType,
  TestPlanModel,
  TestType,
} from '@/lib/constants';
import Parse from '@/lib/parse';
import type { TemplateDataSourceConfig } from '@/lib/testReport';
import {
  CustomDataSourceKey,
  DataSource,
  genDataSourceConfigUid,
  ReportChartGroupKey,
  ReportTemplateChartGroupKey,
  SupportDataSourceChartViewReg,
} from '@/lib/testReport';
import fetch from '@/lib/utils/fetch';
import { getPluginWebTriggerBaseUrl, getSessionToken } from '@/lib/utils/helper';

import { Chart, ChartGroup, Workspace } from '../models';

// 自定义数据源源码最大并发数量
const parallelRequestTriggerLimit = 4;

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

async function fetchReportPlan(
  selector,
  needAncestors: boolean,
): Promise<{ list: string[]; ancestorIds?: string[] }> {
  const params = needAncestors
    ? {
        fields: ['ancestors'],
      }
    : {
        onlySelectId: true,
      };
  const data = await getTestEntityByQuery({
    selector,
    limit: 99999,
    ...params,
  });
  // 不需要父事项
  if (!needAncestors) return data;
  // 需要父亲事项
  return {
    list: data.list.map(i => i.id),
    ancestorIds: uniq(data.list.map(i => i.ancestors?.pop()).filter(Boolean)),
  };
}

async function fetchReportExecution(selector): Promise<{ list: string[]; planIds?: string[] }> {
  const data = await getTestEntityByQuery({
    selector,
    limit: 99999,
    fields: [TestFiledKeyMapping.linkItems],
  });

  return {
    list: data.list.map(i => i.id),
    planIds: uniq(data.list.map(i => i.linkItems?.pop()).filter(Boolean)),
  };
}

/** 获取一级数据源 */
const buildFirstLevelDsIqlConfig = async (dsConfig: TemplateDataSourceConfig[], reportParams) => {
  // 根据 key 做唯一性处理
  const uniqFirstLevelDataSources = uniqBy(
    dsConfig.filter(ds => ds[0]),
    ds => ds[0].key,
  ).map(ds => ds[0]);

  // 针对不同的数据源生成不同的 IQL，默认使用 default 的生成方式
  const buildIqlStrategies = {
    currentWorkspace: async () =>
      reportParams.workspace && reportParams?.workspace?.key
        ? `"workspaceKey" = "${reportParams.workspace.key}"`
        : '',
    // 默认的直接从 dataSourceIql 中取
    default: async (ds: DataSource) => reportParams.dataSourceIql?.[ds.selector],
  };

  return await uniqFirstLevelDataSources.reduce(async (firstLevelConfig, ds) => {
    const dsStrategyKey = buildIqlStrategies[ds.key] ? ds.key : 'default';
    const firstLevelDsIql = await buildIqlStrategies[dsStrategyKey](ds);
    return {
      ...(await firstLevelConfig),
      [ds.key]: firstLevelDsIql,
    };
  }, {});
};

/** 获取测试计划关联的 ids */
const getPlanRefTestEntityIds = async (planIds, dsConfig: TemplateDataSourceConfig[]) => {
  const ret = {};

  // 获取测试计划关联的用例
  const getCaseIdsByPlan = async planIds => {
    const { list: caseIds = [] } = await getLinkedTestEntityByQuery({
      query: {
        type: TestType.Case,
      },
      linkType: TestLinkType.CaseLinkPlan,
      sourceIds: planIds,
      destinationType: TestType.Case,
      limit: 99999,
      onlySelectId: true,
    });

    return caseIds;
  };

  // 获取测试计划关联的执行
  const getRunIdsByPlan = async planIds => {
    const { list: executionIds = [] } = await getLinkedTestEntityByQuery({
      query: {
        type: TestType.Execution,
      },
      limit: 99999,
      sourceIds: planIds,
      onlySelectId: true,
      destinationType: TestType.Execution,
      linkType: TestLinkType.ExecutionLinkPlan,
    });

    const { list: runIds = [] } = await getLinkedTestEntityByQuery({
      query: {
        type: TestType.Run,
      },
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: executionIds,
      destinationType: TestType.Run,
      limit: 99999,
      onlySelectId: true,
    });

    return runIds;
  };

  // 获取测试计划关联的缺陷
  const getDefectIdsByRunIds = async runIds => {
    const { list: runList } = await getTestEntityByQuery({
      query: {
        id: runIds,
      },
      select: ['id', 'runDetail'],
      limit: 99999,
    });

    const runDetails = runList?.map(d => d?.runDetail).filter(Boolean) ?? [];
    const getDefectId = runDetails => {
      const stepDefectIds = runDetails
        .filter(d => d?.steps)
        .map(d => d.steps)
        .flat()
        .map(d => d.defectItemIds ?? [])
        .flat();
      const runDefectItemIds = runDetails.map(d => d?.defectItemIds ?? []).flat();
      return [...new Set([...stepDefectIds, ...runDefectItemIds])].filter(Boolean);
    };

    return getDefectId(runDetails);
  };

  const shouldFetchPlanRefEntityIds = testType =>
    dsConfig.some(ds => ds[0].selector === TestPlanModel && ds[1]?.key === testType);

  if (shouldFetchPlanRefEntityIds(TestType.Case)) {
    ret[TestType.Case] = await getCaseIdsByPlan(planIds);
  }

  if (
    shouldFetchPlanRefEntityIds(TestType.Run) ||
    shouldFetchPlanRefEntityIds(TestType.TestDefect)
  ) {
    ret[TestType.Run] = await getRunIdsByPlan(planIds);
  }

  if (shouldFetchPlanRefEntityIds(TestType.TestDefect)) {
    ret[TestType.TestDefect] = await getDefectIdsByRunIds(ret[TestType.Run]);
  }

  if (shouldFetchPlanRefEntityIds(ExtendReportType.Relative)) {
    (ret as any).relative = await getRelativeItem(planIds);
  }

  return ret;
};

/** 获取测试执行任务关联的 ids */
const getExecutionRefTestEntityIds = async (executionIds, dsConfig: TemplateDataSourceConfig[]) => {
  const ret = {};

  // 获取测试计划关联的执行
  const getRunIdsByExecution = async executionIds => {
    const data = await getLinkedTestEntityByQuery({
      query: {
        type: TestType.Run,
      },
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: executionIds,
      destinationType: TestType.Run,
      limit: 99999,
      fields: [TestFiledKeyMapping.referenceCase],
    });

    return {
      runIds: data.list.map(i => i.id),
      caseIds: uniq(data.list.map(i => i.referenceCase).filter(Boolean)),
    };
  };

  // 获取测试计划关联的缺陷
  const getDefectIdsByRunIds = async runIds => {
    const { list: runList } = await getTestEntityByQuery({
      query: {
        id: runIds,
      },
      select: ['id', 'runDetail'],
      limit: 99999,
    });

    const runDetails = runList?.map(d => d?.runDetail).filter(Boolean) ?? [];
    const getDefectId = runDetails => {
      const stepDefectIds = runDetails
        .filter(d => d?.steps)
        .map(d => d.steps)
        .flat()
        .map(d => d.defectItemIds ?? [])
        .flat();
      const runDefectItemIds = runDetails.map(d => d?.defectItemIds ?? []).flat();
      return [...new Set([...stepDefectIds, ...runDefectItemIds])].filter(Boolean);
    };

    return getDefectId(runDetails);
  };

  const shouldFetchExecutionRefEntityIds = testType =>
    dsConfig.some(ds => ds[0].selector === TestExecutionModel && ds[1]?.key === testType);

  if (
    shouldFetchExecutionRefEntityIds(TestType.Run) ||
    shouldFetchExecutionRefEntityIds(TestType.Case)
  ) {
    const data = await getRunIdsByExecution(executionIds);
    ret[TestType.Run] = data.runIds;
    ret[TestType.Case] = data.caseIds;
  }

  if (shouldFetchExecutionRefEntityIds(TestType.TestDefect)) {
    ret[TestType.TestDefect] = await getDefectIdsByRunIds(ret[TestType.Run]);
  }

  if (shouldFetchExecutionRefEntityIds(ExtendReportType.Relative)) {
    ret[ExtendReportType.Relative] = await getRelativeAllItem(executionIds);
  }

  return ret;
};

// 获取自定义数据源请求结果集
const getCustomDataSourceResults = async (dsConfigs, reportParams, dsIqlConfig) => {
  // 自定义数据源结果
  let customDataSourceConfigResult = {} as any;
  const isCustomDataSourceSelector = dsConfig => dsConfig[0]?.key === CustomDataSourceKey;

  // 是否有自定义数据源
  const hasCustomDataSourceSelector = dsConfigs.some(isCustomDataSourceSelector);

  if (hasCustomDataSourceSelector) {
    const parallelRequestWebTrigger = () => {
      return new Promise((resolve, reject) => {
        const customDataSourceConfig = dsConfigs
          .filter(isCustomDataSourceSelector)
          .map(ds => ds[1]?.config)
          .filter(Boolean);

        const webTriggerKeys = uniq(
          customDataSourceConfig?.map(d => d?.webTriggerKey).filter(Boolean) ?? [],
        );

        const taskRunners = webTriggerKeys.map((webTriggerKey: string) => async cb => {
          let ret = null;
          try {
            const { data, status } = await fetch.$post(
              `${pluginWebTriggerBaseUrl}/${webTriggerKey}`,
              {
                report: reportParams.report,
                reportOverviewData: reportParams.reportOverviewData,
                workspace: reportParams.workspace,
                dsIqlConfig,
                sessionToken: getSessionToken(),
              },
              {
                // 设置 30s 超时时间
                timeout: 300000,
              },
            );
            if (status === 'ok') {
              ret = data;
            }
          } catch (err) {
            console.error('request custom data source error: ', err);
          }
          cb(null, {
            [webTriggerKey]: ret,
          });
        });

        // 请求自定义数据源
        parallelLimit(taskRunners, parallelRequestTriggerLimit, (errors, data) => {
          if (Array.isArray(errors) && errors.filter(Boolean).length) return reject(errors);
          resolve(
            data.reduce(
              (acc, i) => ({
                ...acc,
                ...i,
              }),
              {},
            ),
          );
        });
      });
    };

    customDataSourceConfigResult = await parallelRequestWebTrigger();
    customDataSourceConfigResult.report = reportParams.report;
  }

  return customDataSourceConfigResult;
};

const buildSecondLevelDsIqlConfig = async (
  firstLevelDsIqlConfig,
  dsConfig: TemplateDataSourceConfig[],
  reportParams,
) => {
  // 只需要处理有第二级的数据源，并对第二级别数据源做处理
  const dsConfigs = uniqBy(
    dsConfig.filter(ds => ds[1]),
    ds => genDataSourceConfigUid(ds),
  );

  // 是否测试计划选择器
  const isTestPlanSelector = dsConfig => dsConfig[0]?.selector === TestPlanModel;
  // 是否测试计划选择器
  const isTestExecutionSelector = dsConfig => dsConfig[0]?.selector === TestExecutionModel;
  // 获取一级数据源的 IQL
  const getFirstLevelDsIql = dsConfig => firstLevelDsIqlConfig[dsConfig[0].key];
  // 是否是父事项筛选
  const isParentSelector = dsConfig => !!dsConfig?.find(i => i.key === ExtendReportType.Parent);

  // 所选测试计划下关联的实体 ids
  let planRefTestEntityIds = {} as any;
  // 所选测试执行任务下关联的实体 ids
  let executionRefTestEntityIds = {} as any;

  const hasTestPlanSelector = dsConfigs.some(isTestPlanSelector);
  const hasTestExecutionSelector = dsConfigs.some(isTestExecutionSelector);
  const hasParentSelector = dsConfigs.some(isParentSelector);

  // 一级选择器下有所选测试计划
  if (hasTestPlanSelector) {
    // 获取测试计划关联的实体 ids
    const { list: planIds, ancestorIds } = await fetchReportPlan(
      reportParams.dataSourceIql?.[TestPlanModel],
      hasParentSelector,
    );
    planRefTestEntityIds = await getPlanRefTestEntityIds(planIds, dsConfig);
    planRefTestEntityIds.ancestorIds = ancestorIds || [];
  }

  // 一级选择器下有所选测试计划
  if (hasTestExecutionSelector) {
    // 获取测试计划关联的实体 ids
    const { list: executionIds, planIds } = await fetchReportExecution(
      reportParams.dataSourceIql?.[TestExecutionModel],
    );
    executionRefTestEntityIds = await getExecutionRefTestEntityIds(executionIds, dsConfig);
    executionRefTestEntityIds.planIds = planIds || [];
    executionRefTestEntityIds.self = executionIds || [];
  }

  // 针对不同的二级数据源生成不同的 IQL
  const secondDataSourceBuildIqlStrategies = {
    [TestType.Case]: async (dsConfig: TemplateDataSourceConfig) => {
      if (isTestPlanSelector(dsConfig)) {
        return `id in ${JSON.stringify(planRefTestEntityIds[TestType.Case])}`;
      }

      if (isTestExecutionSelector(dsConfig)) {
        return `id in ${JSON.stringify(executionRefTestEntityIds[TestType.Case])}`;
      }

      return `(${getFirstLevelDsIql(dsConfig)}) and ("itemTypeKey" = ${
        reportParams.itemTypeMap[TestType.Case]
      })`;
    },
    [TestType.Run]: async (dsConfig: TemplateDataSourceConfig) => {
      if (isTestPlanSelector(dsConfig)) {
        // 一级数据源为测试计划，则需要查询到测试计划下的所有测试执行
        return `id in ${JSON.stringify(planRefTestEntityIds[TestType.Run])}`;
      } else if (isTestExecutionSelector(dsConfig)) {
        return `id in ${JSON.stringify(executionRefTestEntityIds[TestType.Run])}`;
      } else {
        return `(${getFirstLevelDsIql(dsConfig)}) and ("itemTypeKey" = "test_manager_run")`;
      }
    },
    [TestType.TestDefect]: async (dsConfig: TemplateDataSourceConfig) => {
      if (isTestPlanSelector(dsConfig)) {
        // 一级数据源为测试计划，则需要查询到测试计划下的所有测试执行
        return `id in ${JSON.stringify(planRefTestEntityIds[TestType.TestDefect])}`;
      } else if (isTestExecutionSelector(dsConfig)) {
        return `id in ${JSON.stringify(executionRefTestEntityIds[TestType.TestDefect])}`;
      } else {
        return `(${getFirstLevelDsIql(dsConfig)}) and ("itemTypeKey" in ${JSON.stringify(
          reportParams.defectsMapping ?? [],
        )})`;
      }
    },
    [ExtendReportType.Parent]: async () => {
      return `id in ${JSON.stringify(planRefTestEntityIds.ancestorIds)}`;
    },
    [ExtendReportType.PlanParent]: async () => {
      return `children in ${JSON.stringify(executionRefTestEntityIds.planIds ?? [])}`;
    },
    [ExtendReportType.Self]: async () => {
      return `id in ${JSON.stringify(executionRefTestEntityIds.self ?? [])}`;
    },
    [ExtendReportType.Relative]: async dsConfig => {
      if (isTestPlanSelector(dsConfig)) {
        return `id in ${JSON.stringify(
          planRefTestEntityIds[ExtendReportType.Relative] || [],
        )} and ("itemTypeKey" in ${JSON.stringify(reportParams.defectsMapping ?? [])}) `;
      }

      if (isTestExecutionSelector(dsConfig)) {
        return `id in ${JSON.stringify(
          executionRefTestEntityIds[ExtendReportType.Relative] || [],
        )} and ("itemTypeKey" in ${JSON.stringify(reportParams.defectsMapping ?? [])}) `;
      }
    },
  };

  return dsConfigs.reduce(async (iqlConfigs, ds) => {
    const secondLevelDs = ds[1];
    if (!secondLevelDs) return iqlConfigs;
    const dsStrategyKey = secondLevelDs.key;
    // 二级数据源中可能存在自定义数据源，需要进行容错处理
    const iql = (await secondDataSourceBuildIqlStrategies[dsStrategyKey]?.(ds)) ?? '';
    return {
      executionRefTestEntityIds,
      planRefTestEntityIds,
      ...(await iqlConfigs),
      [genDataSourceConfigUid(ds)]: iql,
    };
  }, {});
};

/** 数据源 IQL 生成器新版  */
const buildIqlConfigsByDataSourceConfigs = async (
  dataSourceConfigs: any[],
  reportParams?: Record<string, any>,
) => {
  // 获取一级的数据源
  const firstLevelDsIqlConfig = await buildFirstLevelDsIqlConfig(dataSourceConfigs, reportParams);

  // 获取二级数据源
  const secondLevelDsIqlConfig = await buildSecondLevelDsIqlConfig(
    firstLevelDsIqlConfig,
    dataSourceConfigs,
    reportParams,
  );

  return dataSourceConfigs.reduce(
    (iqlConfig, dsConfig) => {
      const dsConfigKey = genDataSourceConfigUid(dsConfig);

      return {
        ...iqlConfig,
        [dsConfigKey]:
          dsConfig.length === 1
            ? firstLevelDsIqlConfig[dsConfig[0].key]
            : secondLevelDsIqlConfig[dsConfigKey],
      };
    },
    {
      secondLevelDsIqlConfig,
    },
  );
};

// chartData 工厂
const chainChartDataAdaptor = (chartData, dataSource) => {
  const adaptorChain = {
    /** chart iql 绑定适配器，某些报告小组件比较特殊，需要增加适配器 */
    iql(iqlConfigs) {
      const iql = iqlConfigs[genDataSourceConfigUid(dataSource)];
      // iql 组合器
      class IqlComposer {
        mergedIql = '';

        constructor(mergedIql = '') {
          this.mergedIql = mergedIql;
        }

        composeIql = iql => {
          const { mergedIql } = this;
          if (iql) {
            this.mergedIql += mergedIql ? ` and (${iql})` : iql;
          }
          return this;
        };
      }

      // 基础配置
      const BasicOptions = {
        iqlContext: {
          displayContext: 'test_manager',
        },
        // 增加筛选字段类型，使报表小组件再查询字段时保留这些字段的类型
        extensionOption: {
          fieldTypeKeys: [
            'r_test_manager_es_object',
            'r_test_manager_es_text_keyword',
            'r_test_manager_es_array_keyword',
          ],
        },
        // 默认 iql 查询
        queryType: 'expression',
      };

      const adaptors = {
        'basic-count-chart': option => {
          const targetOption = option?.target;

          return {
            ...option,
            ...BasicOptions,
            target: targetOption?.map?.(option => {
              const mergedIQL = new IqlComposer().composeIql(option?.iql).composeIql(iql).mergedIql;

              return {
                ...BasicOptions,
                ...omit(option, ['iql', 'selectors', 'queryType']),
                iql: mergedIQL,
                value: option.value?.map?.(opt => ({
                  ...BasicOptions,
                  ...omit(opt, ['iql', 'selectors', 'queryType']),
                  iql: mergedIQL,
                })),
              };
            }),
          };
        },
        default: option => {
          const pureOption = omit(option, ['iql', 'selectors', 'queryType']);

          const mergedIQL = new IqlComposer().composeIql(option?.iql).composeIql(iql).mergedIql;

          return Object.assign(
            {
              // 贮存原始 iql，方便后期恢复
              stashIql: option?.iql ?? '',
              // 合并 iql
              iql: mergedIQL,
              ...BasicOptions,
            },
            pureOption,
          );
        },
      };

      chartData.option = (adaptors[chartData.view] ?? adaptors.default)(chartData.option);

      return adaptorChain;
    },
    /** 自定义数据源 */
    customDataSource(customDataSourceResults) {
      const adaptors = {
        richText(chartOption, chartOptionAdaptor, result) {
          let richTextValue = chartOption.richTextValue ?? [];
          let replaceValue;
          const context = cloneDeep(result);
          const replace = data => {
            replaceValue = data;
          };
          const { text, useTemplate } = chartOptionAdaptor;
          if (useTemplate) {
            let richTextValueString = JSON.stringify(richTextValue);
            richTextValueString = richTextValueString.replace(/#{{(.*?)}}#/g, (_, s) => {
              const fun = new Function('context', 'dayjs', 'replace', `return ${s}`);
              let result = '';
              try {
                result = fun(context, dayjs, replace);
              } catch (e) {
                result = '';
              }
              return result;
            });
            richTextValue = replaceValue ?? JSON.parse(richTextValueString);
          } else {
            richTextValue = [
              {
                type: 'p',
                children: [
                  {
                    type: 'a',
                    url: result,
                    children: [
                      {
                        text,
                      },
                    ],
                    id: Date.now(),
                  },
                ],
              },
            ];
          }

          return {
            ...chartOption,
            richTextValue,
          };
        },
      };

      const customDataSource = dataSource?.[0].key === CustomDataSourceKey && dataSource?.[1];

      if (customDataSource) {
        const {
          webTriggerKey,
          chartOptionAdaptor,
          resultHandler: resultHandlerStr,
        } = customDataSource.config ?? {};
        const customDataSourceResult = customDataSourceResults[webTriggerKey];

        if (customDataSourceResult) {
          try {
            const { useTemplate } = chartOptionAdaptor;
            let result;
            if (useTemplate) {
              result = { report: customDataSourceResults.report, ...customDataSourceResult };
            } else {
              const resultHandler = new Function(`return ${resultHandlerStr}`)();
              result = resultHandler(customDataSourceResult);
            }

            chartData.option = adaptors[chartOptionAdaptor.key](
              chartData.option,
              chartOptionAdaptor,
              result,
            );

            console.info('result---------->', chartData, chartOptionAdaptor, result);
          } catch (err) {
            console.error('result handler execute error: ', err);
          }

          return adaptorChain;
        }
      }
      return adaptorChain;
    },

    chartData,
  };

  return adaptorChain;
};

export type TestReportModelType = {
  objectId: string;
  /** 报告名称 */
  name: string;
  /** 对应的 chartGroup */
  chartGroup: any;
  /** 空间 */
  workspace: any;
  /** 创建人 */
  createdBy: any;
  /** 创建时间 */
  createdAt: any;

  /** 是否是测试报告模板 */
  isTemplate: boolean;

  // ------ 报告模板相关数据字段 ------ //
  /** 是否是租户级模板 */
  isGlobalTemplate: boolean;
  /** 是否是默认模板 */
  isDefaultTemplate: boolean;
  /** 模板配置文件 */
  templateConfig: {
    /** 概览配置 */
    reportOverviewConfig: {
      /** 是否启用概览 */
      enabled: boolean;
    };
    /** 数据源配置 */
    dataSource: Record<string, [DataSource] | [DataSource, DataSource]>;
  };

  // ------ 报告相关数据字段 ------ //
  /** 基于哪个模板生成 */
  usingReportTemplate: any;
  /** 报告状态 */
  reportStatus: string;
  /** 报告概览数据 */
  reportOverviewData: Record<string, any>;
  /** 报告禁用状态 */
  disabled: boolean;
  /** 报告所选择的模板文件 */
  reportTemplate: any;
  /** 测试报告导出校验脚本 */
  validateScript: string;
};

/** 测试报告模板相关的 Key */
const FilterReportTemplateKey = [
  'isTemplate',
  'isGlobalTemplate',
  'isDefaultTemplate',
  'templateConfig',
] as (keyof TestReportModelType)[];

// 排除原始数据中的字段
const FilterOriginalParseDataKeys = ['objectId', 'key', 'className', 'chartGroup', '__type'];

// 测试报告模板
const TestReport = Parse.Object.extend('test_manager_TestReport', {
  /** 创建报告模板 */
  async createTemplate(reportTemplateParams) {
    const objectId = this.get('objectId');
    const isExisted = Boolean(objectId);
    if (isExisted) throw new Error(t('page.reportTemplateCreator.templateExisted'));

    if (reportTemplateParams.name?.length > 250) {
      throw new Error(t('page.reportTemplateCreator.templateNameTooLong'));
    }

    // 重名校验逻辑
    const existedNameTemplateQuery = new Parse.Query(TestReport).equalTo(
      'name',
      reportTemplateParams.name,
    );

    if (reportTemplateParams.workspace) {
      existedNameTemplateQuery.equalTo(
        'workspace',
        Workspace.createWithoutData(reportTemplateParams.workspace),
      );
    } else if (reportTemplateParams.isGlobalTemplate) {
      existedNameTemplateQuery.equalTo('isGlobalTemplate', reportTemplateParams.isGlobalTemplate);
    }

    // 校验名称是否重复
    const alreadyExistedSameNameTemplate = await existedNameTemplateQuery
      .select(['objectId'])
      .first({ json: true });

    if (alreadyExistedSameNameTemplate) {
      throw new Error(t('page.reportTemplateCreator.nameExisted'));
    }

    const { name, workspace, isDefaultTemplate, isGlobalTemplate, templateConfig } = Object.assign(
      {},
      this,
      reportTemplateParams,
    );

    // 创建 chartGroup object
    const chartGroupObject = await new ChartGroup({
      name,
      global: true,
      key: ReportTemplateChartGroupKey,
    }).save();

    // 创建 chartGroup template
    this.set({
      name,
      templateConfig,
      isTemplate: true,
      isGlobalTemplate,
      isDefaultTemplate,
      chartGroup: chartGroupObject,
      workspace: typeof workspace === 'string' ? Workspace.createWithoutData(workspace) : workspace,
      createdBy: Parse.User.current(),
    });

    // 创建 report template
    return this.save();
  },

  /** 生成测试报告 */
  async createReport(
    templateId: string,
    reportParams: Partial<Pick<TestReportModelType, 'reportStatus' | 'reportOverviewData'>> &
      Pick<TestReportModelType, 'workspace' | 'name'> & {
        dataSourceIql?: Record<string, string>;
        defectsMapping?: string[];
        itemTypeMap?: string[];
        report?: Record<string, any>;
      },
  ) {
    if (reportParams.name?.length > 250) {
      throw new Error(t('page.reportTemplateCreator.reportNameTooLong'));
    }
    // 获取模板数据
    const templateReportData = await new Parse.Query(TestReport)
      .equalTo('objectId', templateId)
      .include(['chartGroup'])
      .first({ json: true });

    const reportTemplateChartGroup = templateReportData.chartGroup;
    /** 报告模板配置数据 */
    const reportTemplateConfig = templateReportData.templateConfig;

    // 获取模板关联的 chart 数据
    const chartGroupId = reportTemplateChartGroup.objectId;
    const chartDataList = await new Parse.Query(Chart)
      .equalTo('chartGroup', chartGroupId)
      .findAll({ json: true });

    // 创建测试报告
    // 1. 创建测试报告关联的 chartGroup
    const chartGroupObject = new ChartGroup();
    chartGroupObject.set({
      ...omit(
        reportTemplateChartGroup,
        FilterOriginalParseDataKeys.concat(FilterReportTemplateKey),
      ),
      name: reportParams?.report?.name ?? ReportChartGroupKey,
      key: ReportChartGroupKey,
    });
    await chartGroupObject.save();

    const chartGroupData = chartGroupObject.toJSON();
    const templateDataSourceConfig = reportTemplateConfig?.dataSource ?? {};

    const dataSourceConfigs = Object.values(templateDataSourceConfig);

    const originIqlConfigs = await buildIqlConfigsByDataSourceConfigs(
      dataSourceConfigs,
      reportParams,
    );
    const { secondLevelDsIqlConfig, ...iqlConfigs } = originIqlConfigs;

    // 获取自定义数据源的结果集
    const customDataSourceResults = await getCustomDataSourceResults(
      dataSourceConfigs,
      reportParams,
      secondLevelDsIqlConfig,
    );

    console.info(
      '<---------- customDataSourceResults&iqlConfigs ---------->',
      customDataSourceResults,
      iqlConfigs,
    );

    // 2. 创建测试报告关联的 chart
    const newChartObjects = chartDataList.map(chartData => {
      const newChartObject = new Chart();

      newChartObject.set({
        ...omit(chartData, FilterOriginalParseDataKeys),
        chartGroup: ChartGroup.createWithoutData(chartGroupData.objectId),
      });

      // 只有 basic 类型的 chart 才可以使用数据源
      if (SupportDataSourceChartViewReg.test(chartData.view)) {
        const dataSource = templateDataSourceConfig[chartData.objectId];
        // 根据数据源配置生成对应的 iql
        const modifyChartData = chainChartDataAdaptor(chartData, dataSource)
          // 根据 iql 增加到 chartOption 中
          .iql(iqlConfigs)
          // 如果是自定义数据源，则需要将自定义数据源的结果集绑定到 chartOption 中
          .customDataSource(customDataSourceResults).chartData;

        console.info('<-----modifyChartData----->', modifyChartData.view, modifyChartData);

        // 设置 option
        newChartObject.set({ ...omit(modifyChartData, FilterOriginalParseDataKeys) });
      }
      return newChartObject;
    });

    // 3. 创建 test_manager_TestReport
    const reportInfo = {
      ...omit(templateReportData, FilterOriginalParseDataKeys.concat(FilterReportTemplateKey)),
      isTemplate: false,
      name: reportParams.report.name,
      reportStatus: reportParams.reportStatus,
      reportOverviewData: reportParams?.reportOverviewData,
      usingReportTemplate: TestReport.createWithoutData(templateId),
      chartGroup: ChartGroup.createWithoutData(chartGroupData.objectId),
      workspace: Workspace.createWithoutData(reportParams.workspace?.objectId),
      createdBy: Parse.User.current(),
    };
    const newTestReportObject = new TestReport().set(reportInfo);

    try {
      const reportIsV2 = featureFlags(SupportFeatureFlags.ENABLE_TEST_REPORT_V2);
      const res: any[] = await Parse.Object.saveAll(
        reportIsV2 ? newChartObjects : [...newChartObjects, newTestReportObject],
      );
      return {
        status: 'success',
        data: reportIsV2 ? reportInfo : last(res)?.toJSON(),
      };
    } catch (error) {
      return {
        status: 'failed',
      };
    }
  },

  /** 删除报告或模板 */
  async delete(objectId) {
    if (!objectId) throw new Error('TestReport is not existed');
    try {
      const testReportObject = await new Parse.Query(TestReport)
        .equalTo('objectId', objectId)
        .first();
      const chartGroupData = testReportObject.toJSON();
      const chartGroupObjectId = chartGroupData.chartGroup.objectId;
      const chartGroupQuery = new Parse.Query('ChartGroup')
        .equalTo('objectId', chartGroupObjectId)
        .first();

      const chartQuery = new Parse.Query('Chart')
        .equalTo('chartGroup', chartGroupObjectId)
        .findAll();

      const [chartGroupObject, chartObjects] = await Promise.all([chartGroupQuery, chartQuery]);
      await Parse.Object.destroyAll([testReportObject, chartGroupObject, ...chartObjects]);
    } catch (error) {
      console.error(error);
    }
  },
});

export default TestReport;
