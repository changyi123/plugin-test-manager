import { flattenDepth, omitBy } from 'lodash';

import { getLinkedTestEntityByQuery, getTestEntityByQuery } from './api/item';
import { TestLinkType, TestPlanModel, TestType } from './constants';

export type SelectorType = 'test_manager_Plan' | 'sprint' | 'version' | 'workspace' | 'customField';

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

/** 数据源 IQL 生成器  */
export const dataSourceIqlGenerator = async (
  dataSource: TemplateDataSourceConfig,
  reportParams?: Record<string, any>,
) => {
  const { dataSourceIql, defectsMapping } = reportParams;
  console.info(dataSource, dataSourceIql);
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
      const pureOption = omitBy(option, ['iql', 'selectors']);
      return Object.assign(
        {
          // 贮存原始 iql，方便后期恢复
          stashIql: option.iql,
          iql: `${iql} and (${option.iql})`,
          iqlContext: {
            displayContext: 'test_manager',
          },
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
