import { flattenDepth, isEmpty, omit } from 'lodash';

import { getLinkedTestEntityByQuery, getTestEntityByQuery } from './api/item';
import { TestLinkType, TestPlanModel, TestType } from './constants';
import { getPagePrefix } from './utils/helper';
import { mergeIQL } from './utils/iql';

/** 测试报告名称最大支持的长度限制 */
export const TestReportMaxNameLength = 25;

export type SelectorType =
  | 'test_manager_Plan'
  | 'sprint'
  | 'version'
  | 'workspace'
  | 'customField'
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
    key: 'workspace',
    isFirstLevel: true,
    selector: 'workspace',
  },
  {
    key: 'currentWorkspace',
    isFirstLevel: true,
    selector: 'currentWorkspace',
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

/** 获取数据源预备数据 */
export const dataSourcePrepareData = (
  dataSourceConfig: Record<string, TemplateDataSourceConfig>,
) => {
  const flattedDataSources = flattenDepth(Object.values(dataSourceConfig), 2);
  console.info(flattedDataSources);
};

export const getDataSourceConfigMapKey = (dataSource: any[]) => {
  const [firstLevel, secondLevel] = dataSource;
  return `${firstLevel?.selector ?? ''}${secondLevel ? '_' + secondLevel.key : ''}`;
};

const getExcludePlanSelector = dataSourceConfig =>
  Object.values(dataSourceConfig)
    .filter(d => d?.[0]?.selector !== TestPlanModel && d?.[1])
    ?.reduce((prev, cur) => {
      const key = getDataSourceConfigMapKey(cur as any[]);
      if (key) {
        prev[key] = cur;
      }
      return prev;
    }, {}) ?? {};

export const getNeedQueryItemType = dataSourceConfig =>
  Object.values(dataSourceConfig)
    .filter(d => d?.[0]?.selector === TestPlanModel && d?.[1])
    ?.map(d => d?.[1]?.key) ?? [];

/** 数据源 IQL 生成器新版  */
export const newDataSourceIqlGenerator = async (
  dataSourceConfig: any[],
  reportParams?: Record<string, any>,
) => {
  const dataSourceMap = new Map();
  const { dataSourceIql } = reportParams;
  const planIql = dataSourceIql?.[TestPlanModel];
  if (planIql) {
    // 查询测试计划
    const { list: planIds } = await getTestEntityByQuery({
      query: {
        type: TestType.Plan,
      },
      selector: planIql,
      limit: 99999,
      onlySelectId: true,
    });

    dataSourceMap.set(TestType.Plan, planIds);
    // 查询测试计划下的用例、执行、缺陷
    const needQueryItemType = getNeedQueryItemType(dataSourceConfig);
    // 查询测试用例
    await getCaseIdByPlan(dataSourceMap, planIds, needQueryItemType.includes(TestType.Case));
    // 查询测试执行
    await getRunIdByPlan(dataSourceMap, planIds, needQueryItemType.includes(TestType.Run));
    // 查询测试缺陷
    await getDefectIdByPlan(
      dataSourceMap,
      planIds,
      needQueryItemType.includes(TestType.TestDefect),
    );
  }

  await getExcludePlanSelectorIql(dataSourceMap, dataSourceConfig, reportParams);

  // 只有一级查询测试计划且不包含测试计划
  await getExcludePlanSelectorPlanIql(dataSourceMap, dataSourceConfig, reportParams);

  console.info('dataSourceMap -------------->', dataSourceMap);

  return dataSourceMap;
};

export const getDataSourceIqlGenerator = (dataSource, dataSourceMap) => {
  if (!dataSource?.length) return '';
  const iql = dataSourceMap.get(getDataSourceConfigMapKey(dataSource));
  return iql ?? '';
};

const getExcludePlanSelectorIql = async (dataSourceMap, dataSourceConfig, reportParams) => {
  const excludePlanSelector = getExcludePlanSelector(dataSourceConfig);
  if (isEmpty(excludePlanSelector)) return;
  const { dataSourceIql, defectsMapping, itemTypeMap = {} } = reportParams;
  const excludePlanDataSource = await Promise.all(
    Object.values(excludePlanSelector).map(async d => {
      const [firstLevelDataSource, secondLevelDataSource] = d;
      const firstLevelIql = dataSourceIql?.[firstLevelDataSource.selector];
      const query: {
        iql?: string;
      } = {};
      if (secondLevelDataSource.key === TestType.TestDefect) {
        query.iql = `'itemType' in '${JSON.stringify(defectsMapping ?? [])}'`;
      } else {
        const type =
          secondLevelDataSource.key === TestType.Run
            ? 'test_manager_run'
            : itemTypeMap[secondLevelDataSource.key];
        query.iql = `'r_test_manager_type' in ${JSON.stringify(type ? [type] : [])}`;
      }

      return mergeIQL(firstLevelIql, query.iql);
    }),
  );

  Object.keys(excludePlanSelector).forEach((d, index) => {
    dataSourceMap.set(d, excludePlanDataSource[index]);
  });
};

const getExcludePlanSelectorPlanIql = async (dataSourceMap, dataSourceConfig, reportParams) => {
  // 只有一级查询测试计划且不包含测试计划
  const excludePlanAndNoHaveSecondLevelDataSource = Object.values(dataSourceConfig as any[])
    .filter(d => d.length === 1 && d?.[0] !== TestPlanModel)
    .reduce((prev, cur) => {
      const key = getDataSourceConfigMapKey(cur as any[]);
      if (key) {
        prev[key] = cur;
      }
      return prev;
    }, {});

  if (isEmpty(excludePlanAndNoHaveSecondLevelDataSource)) return;
  const { dataSourceIql, itemTypeMap = {} } = reportParams;
  const planDataList = await Promise.all(
    Object.values(excludePlanAndNoHaveSecondLevelDataSource).map(async d => {
      const [firstLevelDataSource] = d as any[];
      const firstLevelIql = dataSourceIql?.[firstLevelDataSource.selector];
      return mergeIQL(
        firstLevelIql,
        `'r_test_manager_type' in ${JSON.stringify([itemTypeMap[TestType.Plan]])}`,
      );
    }),
  );
  Object.keys(planDataList).forEach((d, index) => {
    dataSourceMap.set(d, planDataList[index]);
  });
};

const getCaseIdByPlan = async (dataSourceMap, planIds, isQuery) => {
  if (!isQuery) return;
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

  dataSourceMap.set(`${TestPlanModel}_${TestType.Case}`, `'id' in ${JSON.stringify(caseIds)}`);
};

const getExecutionIdByPlan = async (dataSourceMap, planIds) => {
  // 查询测试执行任务
  const { list: executionIds } = await getLinkedTestEntityByQuery({
    query: {
      type: TestType.Execution,
    },
    linkType: TestLinkType.ExecutionLinkPlan,
    sourceIds: planIds,
    destinationType: TestType.Execution,
    limit: 99999,
    onlySelectId: true,
  });

  dataSourceMap.set(`${TestPlanModel}_${TestType.Execution}`, executionIds ?? []);
  return executionIds;
};

const getRunIdByPlan = async (dataSourceMap, planIds, isQuery) => {
  if (!isQuery) return;
  let executionIds = dataSourceMap.get(TestType.Execution);
  if (!dataSourceMap.has(TestType.Execution)) {
    // 查询测试执行任务
    executionIds = await getExecutionIdByPlan(dataSourceMap, planIds);
  }
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

  dataSourceMap.set(`${TestPlanModel}_${TestType.Run}`, `'id' in ${JSON.stringify(runIds)}`);
};

const getDefectIdByPlan = async (dataSourceMap, planIds, isQuery) => {
  if (!isQuery) return;
  let executionIds = dataSourceMap.get(TestType.Execution);
  if (!dataSourceMap.has(TestType.Execution)) {
    // 查询测试执行任务
    executionIds = await getExecutionIdByPlan(dataSourceMap, planIds);
  }
  const { list: runList } = await getLinkedTestEntityByQuery({
    query: {
      type: TestType.Run,
    },
    linkType: TestLinkType.RunLinkExecution,
    sourceIds: executionIds,
    destinationType: TestType.Run,
    limit: 99999,
  });

  const getDefectId = data => {
    const runDetails = data?.map(d => d?.runDetail).filter(Boolean) ?? [];

    const stepDefectIds = runDetails
      .filter(d => d?.steps)
      .map(d => d.steps)
      .flat()
      .map(d => d.defectItemIds ?? [])
      .flat();
    const runDefectItemIds = runDetails.map(d => d?.defectItemIds ?? []).flat();
    return [...new Set([...stepDefectIds, ...runDefectItemIds])].filter(Boolean);
  };
  dataSourceMap.set(TestType.TestDefect, `'id' in ${JSON.stringify(getDefectId(runList))}`);
};

/** 数据源 IQL 生成器  */
export const dataSourceIqlGenerator = async (
  dataSource: TemplateDataSourceConfig,
  reportParams?: Record<string, any>,
) => {
  // TODO 提取公共，优化查询
  const { dataSourceIql, defectsMapping } = reportParams;
  // 无 dataSource，直接范围空字符串
  if (!dataSource?.length) return '';
  // 取第一层级 dataSource 拼写 iql
  // 三种情况：1、[{有plan},{}] 查 plan，在处理二级
  // 2、[{无plan}]，查 plan
  // 3、[{无plan},{}]，层级一 iql 降级查询层级二数据
  const [firstLevelDataSource, secondLevelDataSource] = dataSource;
  const firstLevelIql = dataSourceIql?.[firstLevelDataSource.selector];

  // 是否降级查询,有第二层级，且第一层级无 plan
  const isDowngrade = !!secondLevelDataSource && !firstLevelDataSource?.[TestPlanModel];

  if (isDowngrade) {
    // 降级查询
    const query = {} as Record<string, unknown>;

    if (secondLevelDataSource.key === TestType.TestDefect) {
      const [defectType] = defectsMapping ?? [];
      defectType && (query.itemType = defectType);
    } else {
      query.type = secondLevelDataSource.key;
    }

    const { list: testIds } = await getTestEntityByQuery({
      ...query,
      selector: firstLevelIql,
      limit: 99999,
      onlySelectId: true,
    });

    return testIds?.length ? `'id' in ${JSON.stringify(testIds)}` : '';
  } else {
    // 查询测试计划
    const { list: planIds } = await getTestEntityByQuery({
      query: {
        type: TestType.Plan,
      },
      selector: firstLevelIql,
      limit: 99999,
      onlySelectId: true,
    });

    // 无层级二直接返回 IQL
    if (!secondLevelDataSource) return `'id' in ${JSON.stringify(planIds)}`;

    const itemIds = await getItemIdByPlan({
      planIds,
      secondLevelDataSource,
    });

    return `'id' in ${JSON.stringify(itemIds)}`;
  }
  // TODO: 生成数据源 IQL
};

const getItemIdByPlan = async ({ planIds, secondLevelDataSource }) => {
  // 测试用例
  if (secondLevelDataSource.key === TestType.Case) {
    const { list: caseIds } = await getLinkedTestEntityByQuery({
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
  }
  // 查询测试执行任务
  const { list: executionIds } = await getLinkedTestEntityByQuery({
    query: {
      type: TestType.Execution,
    },
    linkType: TestLinkType.ExecutionLinkPlan,
    sourceIds: planIds,
    destinationType: TestType.Execution,
    limit: 99999,
    onlySelectId: true,
  });

  if (!executionIds?.length) return [];

  // 查询测试执行任务关联的测试执行
  if (secondLevelDataSource.key === TestType.Run) {
    const { list: runIds } = await getLinkedTestEntityByQuery({
      query: {
        type: TestType.Run,
      },
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: executionIds,
      destinationType: TestType.Run,
      limit: 99999,
      onlySelectId: true,
    });
    return runIds ?? [];
  }

  // 查询测试执行关联的缺陷
  if (secondLevelDataSource.key === TestType.TestDefect) {
    const { list: runList } = await getLinkedTestEntityByQuery({
      query: {
        type: TestType.Run,
      },
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: executionIds,
      destinationType: TestType.Run,
      limit: 99999,
    });

    const getDefectId = data => {
      const runDetails = data?.map(d => d?.runDetail).filter(Boolean) ?? [];

      const stepDefectIds = runDetails
        .filter(d => d?.steps)
        .map(d => d.steps)
        .flat()
        .map(d => d.defectItemIds ?? [])
        .flat();
      const runDefectItemIds = runDetails.map(d => d?.defectItemIds ?? []).flat();
      return [...new Set([...stepDefectIds, ...runDefectItemIds])].filter(Boolean);
    };

    return getDefectId(runList);
  }

  return [];
};

/** chart iql 绑定适配器，某些报告小组件比较特殊，需要增加适配器 */
export const bindIqlToChartOption = (iql, chartData) => {
  const adaptors = {
    default: option => {
      const pureOption = omit(option, ['iql', 'selectors', 'queryType']);
      return Object.assign(
        {
          // 贮存原始 iql，方便后期恢复
          stashIql: option?.iql ?? '',
          iql: option?.iql ? `${iql} and (${option.iql})` : iql,
          iqlContext: {
            displayContext: 'test_manager',
            // 增加筛选字段类型，使报表小组件再查询字段时保留这些字段的类型
            extensionOption: {
              fieldTypeKeys: [
                'r_test_manager_es_object',
                'r_test_manager_es_text_keyword',
                'r_test_manager_es_array_keyword',
              ],
            },
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
