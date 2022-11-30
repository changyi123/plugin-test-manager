import { getData, saveAllObject, getParseObject } from '@giteeteam/apps-team-api';

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
      option: `{"iql":"'类型' in [\\"线上Bug\\",\\"Bug\\"]","grid":{"h":2,"w":12,"x":0,"y":0},"type":"basic-table-chart","group":[{"key":"itemType","name":"类型","fieldType":"ItemType"}],"total":{"rowTotal":true},"value":[{"key":"count","name":"事项数","compute":"count","fieldType":"count"}],"cluster":[{"key":"status","name":"状态","fieldType":"Status"}],"selectors":{"HYnEJHIDTU":{"key":"itemType","value":[{"label":"线上Bug","value":"GF9Fn6r0Il"},{"label":"Bug","value":"H8jMWTTYlV"}],"fieldId":"HYnEJHIDTU","component":"ItemType","fieldName":"类型","expression":"ItemType_Contain"},"lA8PQbbJie":{"key":"status","fieldId":"lA8PQbbJie","component":"Status","fieldName":"状态","expression":null}}}`,
    },
    // 2、缺陷明细表
    {
      name: '缺陷明细表',
      view: 'basic-item-list-chart',
      option: `{"iql":"'类型' in [\\"线上Bug\\",\\"Bug\\"]","grid":{"h":4,"w":6,"x":6,"y":4},"type":"basic-item-list-chart","color":"#FFF","pageSize":10,"selectors":{"HYnEJHIDTU":{"key":"itemType","value":[{"label":"线上Bug","value":"GF9Fn6r0Il"},{"label":"Bug","value":"H8jMWTTYlV"}],"fieldId":"HYnEJHIDTU","component":"ItemType","fieldName":"类型","expression":"ItemType_Contain"},"lA8PQbbJie":{"key":"status","fieldId":"lA8PQbbJie","component":"Status","fieldName":"状态","expression":null}},"columnKeys":["name","status","itemType","assignee"]}`,
    },
    // 3、缺陷优先级分布
    {
      name: '缺陷优先级分布',
      view: 'basic-table-chart',
      option: `{"iql":"'类型' in [\\"线上Bug\\",\\"Bug\\"]","grid":{"h":2,"w":12,"x":0,"y":2},"type":"basic-table-chart","color":"#FFF","group":[{"key":"itemType","name":"类型","fieldType":"ItemType"}],"total":{"rowTotal":true},"value":[{"key":"count","name":"事项数","compute":"count","fieldType":"count"}],"cluster":[{"key":"priority","name":"优先级","fieldType":"Priority"}],"selectors":{"HYnEJHIDTU":{"key":"itemType","value":[{"label":"线上Bug","value":"GF9Fn6r0Il"},{"label":"Bug","value":"H8jMWTTYlV"}],"fieldId":"HYnEJHIDTU","component":"ItemType","fieldName":"类型","expression":"ItemType_Contain"},"lA8PQbbJie":{"key":"status","fieldId":"lA8PQbbJie","component":"Status","fieldName":"状态","expression":null}}}`,
    },
    // 4、存量缺陷趋势
    {
      name: '存量缺陷趋势',
      view: 'basic-line-chart',
      option: `{"iql":"'类型' in [\\"线上Bug\\",\\"Bug\\"]","grid":{"h":2,"w":6,"x":0,"y":4},"type":"basic-line-chart","color":"#FFF","group":[{"key":"createdAt","name":"创建时间","dates":[],"compute":"lastThirtyDays","fieldType":"createdAt"}],"value":[{"key":"count","name":"事项数","compute":"count","fieldType":"count"}],"options":{"endAt":"","sprint":"","startAt":""},"orderBy":{},"selectors":{"HYnEJHIDTU":{"key":"itemType","value":[{"label":"线上Bug","value":"GF9Fn6r0Il"},{"label":"Bug","value":"H8jMWTTYlV"}],"fieldId":"HYnEJHIDTU","component":"ItemType","fieldName":"类型","expression":"ItemType_Contain"},"lA8PQbbJie":{"key":"status","value":[],"fieldId":"lA8PQbbJie","component":"Status","fieldName":"状态","expression":null}}}`,
    },
    // 5、bug 负责人分布
    {
      name: 'bug 负责人分布',
      view: 'basic-pie-chart',
      option: `{"iql":"'类型' in [\\"线上Bug\\",\\"Bug\\"]","grid":{"h":2,"w":6,"x":0,"y":6},"type":"basic-pie-chart","color":"#FFF","group":[{"key":"assignee","name":"负责人","fieldType":"Assignee"}],"value":[{"key":"count","name":"事项数","compute":"count","fieldType":"count"}],"options":{"endAt":"","sprint":"","startAt":""},"orderBy":{},"selectors":{"HYnEJHIDTU":{"key":"itemType","value":[{"label":"线上Bug","value":"GF9Fn6r0Il"},{"label":"Bug","value":"H8jMWTTYlV"}],"fieldId":"HYnEJHIDTU","component":"ItemType","fieldName":"类型","expression":"ItemType_Contain"},"lA8PQbbJie":{"key":"status","fieldId":"lA8PQbbJie","component":"Status","fieldName":"状态","expression":null}}}`,
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

const createCharGroup = async (workspace, data, order?: number) => {
  const chartGroupObject = getParseObject(false, 'ChartGroup');

  chartGroupObject.set({
    ...data,
    workspace,
    order,
  });
  const [parseObject] = await saveAllObject([chartGroupObject]);

  return parseObject;
};

// name，option，chartGroupId，view
const createChart = async props => {
  const chartObject = getParseObject(false, 'Chart');
  chartObject.set({
    ...props,
    option: JSON.parse(props.option),
  });
  const [parseObject] = await saveAllObject([chartObject]);

  return parseObject;
};

// 创建 ChartGroup 和 Chart 脚本
export const createCharGroups = async workspaceKey => {
  const needToCreateChartGroups = Promise.all(
    Object.entries(needToCreateChartGroupInfo).map(async ([field, data], index) => {
      const workspace = await getData(false, 'Workspace', {
        workspaceKey,
      });
      const chartGroup = await createCharGroup(workspace, data, index);

      const charts = Promise.all(
        data.chart.map(async chart => {
          return await createChart({
            ...chart,
            workspace,
            chartGroup,
          });
        }),
      );

      return {
        key: field,
        chartGroup,
        charts,
      };
    }),
  );

  return needToCreateChartGroups;
};
