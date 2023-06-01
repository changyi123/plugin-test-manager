import { flattenDepth, omitBy } from 'lodash';

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
    key: 'testCase',
    isFirstLevel: false,
  },
  {
    key: 'testRun',
    isFirstLevel: false,
  },
  {
    key: 'testDefect',
    isFirstLevel: false,
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
export const dataSourceIqlGenerator = (dataSource: TemplateDataSourceConfig) => {
  console.info(dataSource);
  // TODO: 生成数据源 IQL
  // const iql = '';
  // const firstLevelDataSource = dataSource.pop();
  // const secondLevelDataSource = dataSource.pop();
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
