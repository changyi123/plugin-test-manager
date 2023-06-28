import { omit, uniqBy } from 'lodash';

import { getLinkedTestEntityByQuery, getTestEntityByQuery } from './api/item';
import { TestLinkType, TestPlanModel, TestType } from './constants';
import { getPagePrefix } from './utils/helper';

/** 测试报告名称最大支持的长度限制 */
export const TestReportMaxNameLength = 25;

export type SelectorType =
  | 'sprint'
  | 'version'
  | 'customField'
  | 'test_manager_Plan'
  | 'currentWorkspace';

/** 测试报告模板 Key */
export const ReportTemplateChartGroupKey = 'test_manager_report_template' as const;
export const ReportChartGroupKey = 'test_manager_report' as const;

/** 支持数据源配置的 Chart */
export const SupportDataSourceChartViewReg = /^basic/;

// 数据源类型
export type DataSource = {
  /** 筛选器 uid */
  key: string;
  /** 是否是第一级筛选器 */
  isFirstLevel: boolean;
  // 数据源需要创建时限定的范围
  selector?: SelectorType;
  // 二级数据源依赖的一级数据源
  dependOn?: DataSource['key'][];
  notRequired?: boolean;
};

export type TemplateDataSourceConfig = [DataSource] | [DataSource, DataSource];

/** 数据源集合 */
export const DataSourceCollection: DataSource[] = [
  {
    key: 'plan',
    isFirstLevel: true,
    selector: 'test_manager_Plan',
  },
  {
    key: 'sprint',
    isFirstLevel: true,
    selector: 'sprint',
  },
  {
    key: 'version',
    isFirstLevel: true,
    selector: 'version',
  },
  {
    key: 'currentWorkspace',
    isFirstLevel: true,
    notRequired: true,
  },
  // 第二级筛选器
  {
    key: TestType.Case,
    isFirstLevel: false,
    dependOn: ['plan', 'workspace', 'currentWorkspace'],
  },
  {
    key: TestType.Run,
    isFirstLevel: false,
    dependOn: ['plan', 'workspace', 'currentWorkspace'],
  },
  {
    key: TestType.TestDefect,
    isFirstLevel: false,
    dependOn: ['sprint', 'version', 'workspace', 'currentWorkspace'],
  },
];

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

  return ret;
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

  // 是否时测试计划选择器
  const isTestPlanSelector = dsConfig => dsConfig[0]?.selector === TestPlanModel;
  // 获取一级数据源的 IQL
  const getFirstLevelDsIql = dsConfig => firstLevelDsIqlConfig[dsConfig[0].key];

  // 所选测试计划下关联的实体 ids
  let planRefTestEntityIds = {};

  const hasTestPlanSelector = dsConfigs.some(isTestPlanSelector);
  // 一级选择器下有所选测试计划
  if (hasTestPlanSelector) {
    // 获取测试计划关联的实体 ids
    const { list: planIds } = await getTestEntityByQuery({
      selector: reportParams.dataSourceIql?.[TestPlanModel],
      onlySelectId: true,
      limit: 99999,
    });

    planRefTestEntityIds = await getPlanRefTestEntityIds(planIds, dsConfig);
  }

  // 针对不同的数据源生成不同的 IQL
  const buildIqlStrategies = {
    [TestType.Case]: async (dsConfig: TemplateDataSourceConfig) => {
      if (isTestPlanSelector(dsConfig)) {
        return `id in ${JSON.stringify(planRefTestEntityIds[TestType.Case])}`;
      }

      return `(${getFirstLevelDsIql(dsConfig)}) and ("itemTypeKey" = ${
        reportParams.itemTypeMap[TestType.Case]
      })`;
    },
    [TestType.Run]: async (dsConfig: TemplateDataSourceConfig) => {
      if (isTestPlanSelector(dsConfig)) {
        // 一级数据源为测试计划，则需要查询到测试计划下的所有测试执行
        return `id in ${JSON.stringify(planRefTestEntityIds[TestType.Run])}`;
      } else {
        return `(${getFirstLevelDsIql(dsConfig)}) and ("itemTypeKey" = "test_manager_run")`;
      }
    },
    [TestType.TestDefect]: async (dsConfig: TemplateDataSourceConfig) => {
      if (isTestPlanSelector(dsConfig)) {
        // 一级数据源为测试计划，则需要查询到测试计划下的所有测试执行
        return `id in ${JSON.stringify(planRefTestEntityIds[TestType.TestDefect])}`;
      } else {
        return `(${getFirstLevelDsIql(dsConfig)}) and ("itemTypeKey" in ${JSON.stringify(
          reportParams.defectsMapping ?? [],
        )})`;
      }
    },
  };

  return dsConfigs.reduce(async (iqlConfigs, ds) => {
    const secondLevelDs = ds[1];
    if (!secondLevelDs) return iqlConfigs;
    const dsStrategyKey = secondLevelDs.key;
    const iql = await buildIqlStrategies[dsStrategyKey](ds);
    return {
      ...(await iqlConfigs),
      [genDataSourceConfigUid(ds)]: iql,
    };
  }, {});
};

/** 数据源 IQL 生成器新版  */
export const buildIqlConfigsByDataSourceConfigs = async (
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

  return dataSourceConfigs.reduce((iqlConfig, dsConfig) => {
    const dsConfigKey = genDataSourceConfigUid(dsConfig);

    return {
      ...iqlConfig,
      [dsConfigKey]:
        dsConfig.length === 1
          ? firstLevelDsIqlConfig[dsConfig[0].key]
          : secondLevelDsIqlConfig[dsConfigKey],
    };
  }, {});
};

/** chart iql 绑定适配器，某些报告小组件比较特殊，需要增加适配器 */
export const bindIqlToChartOption = (iql, chartData) => {
  const adaptors = {
    default: option => {
      const pureOption = omit(option, ['iql', 'selectors', 'queryType']);

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

      const mergedIQL = new IqlComposer().composeIql(option?.iql).composeIql(iql).mergedIql;

      return Object.assign(
        {
          // 贮存原始 iql，方便后期恢复
          stashIql: option?.iql ?? '',
          // 合并 iql
          iql: mergedIQL,
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
        },
        pureOption,
      );
    },
  };

  return (adaptors[chartData.chartView] ?? adaptors.default)(chartData.option);
};

/** 生成数据源配置 uid */
export const genDataSourceConfigUid = (dataSourceConfig: TemplateDataSourceConfig) => {
  return dataSourceConfig.map(dataSource => dataSource.key).join('_');
};

/** 生成仪表盘页面链接 */
export const genChartGroupPageUrl = ({
  isTemplate,
  chartGroupId,
}: {
  isTemplate?: boolean;
  chartGroupId: string;
}) => {
  const pagePrefix = getPagePrefix();

  const searchParams = new URLSearchParams(
    '?hiddenHeader=true&hiddenSidebar=true&displayContext=test_manager',
  );
  if (isTemplate) {
    searchParams.append('moduleKey', ReportTemplateChartGroupKey);
  } else {
    searchParams.append('showChartListHeader', '1');
    searchParams.append('moduleKey', ReportChartGroupKey);
  }
  if (chartGroupId) {
    searchParams.append('chartGroupId', chartGroupId);
  }

  return `${pagePrefix}/plugin/team_insight_charts_base_team_insight_charts_base?${searchParams.toString()}`;
};
