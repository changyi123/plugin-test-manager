import {
  getData,
  getParseQuery,
  saveAllObject,
  getParseObject,
  getParseModel,
} from '@giteeteam/apps-team-api';
import parallelLimit from 'async/parallelLimit';

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};

const TestDefectChartGroup = {
  group: {
    name: '缺陷统计',
    global: true,
  },
  chart: [
    // 1、缺陷状态分布
    {
      name: '缺陷状态分布',
      view: 'basic-table-chart',
      option: `{"grid":{"h":2,"w":12,"x":0,"y":0},"type":"basic-table-chart","group":[{"key":"itemType","name":"类型","fieldType":"ItemType"}],"total":{"rowTotal":true},"value":[{"key":"count","name":"事项数","compute":"count","fieldType":"count"}],"cluster":[{"key":"status","name":"状态","fieldType":"Status"}]}`,
    },
    // 2、缺陷明细表
    {
      name: '缺陷明细表',
      view: 'basic-item-list-chart',
      option: `{"grid":{"h":4,"w":6,"x":6,"y":4},"type":"basic-item-list-chart","color":"#FFF","pageSize":10,"columnKeys":["name","status","itemType","assignee"]}`,
    },
    // 3、缺陷优先级分布
    {
      name: '缺陷优先级分布',
      view: 'basic-table-chart',
      option: `{"grid":{"h":2,"w":12,"x":0,"y":2},"type":"basic-table-chart","color":"#FFF","group":[{"key":"itemType","name":"类型","fieldType":"ItemType"}],"total":{"rowTotal":true},"value":[{"key":"count","name":"事项数","compute":"count","fieldType":"count"}],"cluster":[{"key":"priority","name":"优先级","fieldType":"Priority"}]}`,
    },
    // 4、新增缺陷趋势
    {
      name: '新增缺陷趋势',
      view: 'basic-line-chart',
      option: `{"grid":{"h":2,"w":6,"x":0,"y":4},"type":"basic-line-chart","color":"#FFF","group":[{"key":"createdAt","name":"创建时间","dates":[],"compute":"lastThirtyDays","fieldType":"createdAt"}],"value":[{"key":"count","name":"事项数","compute":"count","fieldType":"count"}],"options":{"endAt":"","sprint":"","startAt":""},"orderBy":{}}`,
    },
    // 5、缺陷负责人分布
    {
      name: '缺陷负责人分布',
      view: 'basic-pie-chart',
      option: `{"grid":{"h":2,"w":6,"x":0,"y":6},"type":"basic-pie-chart","color":"#FFF","group":[{"key":"assignee","name":"负责人","fieldType":"Assignee"}],"value":[{"key":"count","name":"事项数","compute":"count","fieldType":"count"}],"options":{"endAt":"","sprint":"","startAt":""},"orderBy":{}}`,
    },
  ],
};

const needToCreateChartGroupInfo = {
  TestDefectChartGroup: TestDefectChartGroup,
  //   TestRunExecutionChartGroup: {
  //     group: {
  //       name: '用例执行统计',
  //       global: true,
  //     },
  //     charts: [],
  //   },
  //   TestMemberChartGroup: {
  //     group: {
  //       name: '人员统计',
  //       global: true,
  //     },
  //     charts: [],
  //   },
};

const createCharGroup = data => {
  const chartGroupObject = getParseObject(false, 'ChartGroup');
  chartGroupObject.set(data);
  return chartGroupObject;
};

// name，option，chartGroupId，view
const createChart = (props, options) => {
  const chartObject = getParseObject(false, 'Chart');
  chartObject.set({
    ...props,
    option: { ...JSON.parse(props.option), ...options },
  });
  return chartObject;
};

const { workspaceKeys = [] } = global?.body ?? {};

// 创建 ChartGroup 和 Chart 脚本
const createChartGroups = async ({ workspace, iql, selectors }) => {
  const WorkspaceParseObj = getParseModel(false, 'Workspace');
  const ChartGroupParseObj = getParseModel(false, 'ChartGroup');
  const chartGroupsData = Object.values(needToCreateChartGroupInfo);

  // 创建 chartGroup
  const needToCreateChartGroups = chartGroupsData.map((data, index) =>
    createCharGroup({
      ...data.group,
      workspace: WorkspaceParseObj.createWithoutData(workspace.id),
      key: 'test_manager',
      order: index + 1,
      disabledActions: ['add', 'delete', 'copy', 'favorite'],
    }),
  );
  const chartGroups = await saveAllObject(needToCreateChartGroups);

  // 创建 chart
  const needToCreateChars = chartGroups
    .map(group => {
      const groupJson = group.toJSON();

      return chartGroupsData
        .find(data => data.group.name === groupJson.name)
        ?.chart.map(chart =>
          createChart(
            {
              ...chart,
              workspace: WorkspaceParseObj.createWithoutData(workspace.id),
              chartGroup: ChartGroupParseObj.createWithoutData(group.id),
            },
            {
              selectors,
              iql,
            },
          ),
        );
    })
    .flat();
  const charts = await saveAllObject(needToCreateChars).then(items =>
    items.map(item => item.toJSON()),
  );

  return {
    workspaceKey: workspace?.toJSON()?.key,
    chartGroups: chartGroups.reduce((prev, group) => {
      const groupJson = group.toJSON();
      const [fieldMapKey] = Object.entries(needToCreateChartGroupInfo).find(
        ([_, data]) => data.group.name === groupJson.name,
      );
      prev[fieldMapKey] = {
        chartGroup: groupJson.objectId,
        charts: charts
          .filter(chart => chart.chartGroup.objectId === groupJson.objectId)
          .map(d => d.objectId),
      };

      return prev;
    }, {}),
  };
};

export const batchCreateChartGroups = async workspaceConfigs => {
  const WorkspaceParseQuery = getParseQuery(false, 'Workspace');
  const TestConfigParseQuery = getParseQuery(false, 'test_manager_TestConfig');
  const itemTypeQuery = await getParseQuery(false, 'ItemType');

  if (!workspaceConfigs) {
    const workspaces = await WorkspaceParseQuery.containedIn('key', workspaceKeys)
      .select(['objectId', 'key'])
      .findAll(ParseBaseQueryOptions);
    // 获取空间配置 defectsMapping
    const testConfig = await TestConfigParseQuery.containedIn('workspaceKey', workspaceKeys)
      .select(['defectsMapping', 'workspaceKey', 'objectId'])
      .findAll(ParseBaseQueryOptions)
      .then(items => items?.map(item => item?.toJSON()).filter(Boolean));

    workspaceConfigs = workspaces?.filter(Boolean).map(workspace => ({
      workspace: workspace,
      defectsMapping:
        testConfig?.find(config => config?.workspaceKey === workspace?.get('key'))
          ?.defectsMapping ?? [],
    }));
  }

  // 查询事项类型字段
  const itemTypeField = await getData(false, 'CustomField', {
    key: 'itemType',
  }).then(item => item.toJSON());

  const itemTypesObj = await itemTypeQuery
    .containedIn('key', [...new Set(workspaceConfigs?.map(d => d.defectsMapping).flat())])
    .select(['objectId', 'name', 'key'])
    .find(ParseBaseQueryOptions)
    .then(items =>
      items
        .map(item => {
          const _item = item?.toJSON();
          if (!_item) return;
          return {
            value: _item.objectId,
            label: _item.name,
            key: _item.key,
          };
        })
        .filter(Boolean),
    );

  const getIql = (config, field, types) =>
    config?.defectsMapping
      ? `'${field.name}' in ${JSON.stringify(types.map(item => item.label))}`
      : '';

  const getSelectors = (field, itemTypes) =>
    field
      ? {
          [field.objectId]: {
            component: 'ItemType',
            expression: 'ItemType_Contain',
            fieldId: field.objectId,
            fieldName: field.name,
            key: 'itemType',
            value: itemTypes,
          },
        }
      : {};

  workspaceConfigs = workspaceConfigs.map(config => {
    const itemTypes = itemTypesObj?.filter(d => config?.defectsMapping.includes(d.key)) ?? [];
    return {
      ...config,
      iql: getIql(config, itemTypeField, itemTypes),
      selectors: getSelectors(itemTypeField, itemTypes),
    };
  });

  const taskQueue = workspaceConfigs.map(config => async () => createChartGroups(config));

  const res = await parallelLimit(taskQueue, 10);

  return res;
};
