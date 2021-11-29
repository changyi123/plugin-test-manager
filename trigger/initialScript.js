const APP_KEY = 'test_manager';

// 生成工作流创建表单字段
const getWorkFlowFieldByTemplate = status => {
  const template = JSON.stringify({
    nodes: [
      {
        statusId: 'start_node',
        x: 45,
        y: 40,
        id: 'start_node',
        key: 'start',
        name: '开始',
        type: 'Status',
        width: 30,
        height: 30,
        bgColor: '#c0c0c0',
        nodeType: 'Start',
        selected: false,
        parameters: {},
        isAnySelected: false,
        transitionName: '新建',
      },
      {
        statusId: '<%=todo%>',
        x: 0,
        y: 120,
        id: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
        key: 'Start',
        name: '测试未开始',
        type: 'Status',
        width: 120,
        height: 38,
        selected: false,
        parameters: {
          isAny: true,
        },
        isAnySelected: false,
      },
      {
        statusId: '<%=executing%>',
        x: 140,
        y: 120,
        id: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
        key: 'InProgress',
        name: '测试执行中',
        type: 'Status',
        width: 120,
        height: 38,
        selected: false,
        parameters: {
          isAny: true,
        },
        isAnySelected: false,
      },
      {
        statusId: '<%=failed%>',
        x: 0,
        y: 240,
        id: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
        key: 'Finished',
        name: '测试失败',
        type: 'Status',
        width: 120,
        height: 38,
        selected: false,
        parameters: {
          isAny: true,
        },
        isAnySelected: false,
      },
      {
        statusId: '<%=passed%>',
        x: 140,
        y: 240,
        id: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
        key: 'Finished',
        name: '测试通过',
        type: 'Status',
        width: 120,
        height: 38,
        selected: false,
        parameters: {
          isAny: true,
        },
        isAnySelected: false,
      },
    ],
    transitions: [
      {
        id: 'conn_start_node-Bottom_GfrNuKdLJu-Top',
        name: '新建',
        source: {
          id: 'start_node',
          key: 'start_node',
          name: '',
          anchor: 'Bottom',
        },
        target: {
          id: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
          key: '<%=todo%>',
          name: '测试未开始',
          anchor: 'Top',
        },
        sourceId: 'start_node',
        targetId: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
        elementId: 'con_35',
        parameters: {},
      },
      {
        elementId: '',
        name: '测试未开始',
        id: 'conn_huvHXxlKwk_GfrNuKdLJu',
        sourceId: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
        targetId: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
        source: {
          key: '<%=executing%>',
          anchor: '',
          id: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
          name: '测试执行中',
        },
        target: {
          key: '<%=todo%>',
          anchor: '',
          id: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
          name: '测试未开始',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试未开始',
        id: 'conn_JrulW7nRv1_GfrNuKdLJu',
        sourceId: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
        targetId: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
        source: {
          key: '<%=failed%>',
          anchor: '',
          id: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
          name: '测试失败',
        },
        target: {
          key: '<%=todo%>',
          anchor: '',
          id: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
          name: '测试未开始',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试未开始',
        id: 'conn_a92NTd5o4q_GfrNuKdLJu',
        sourceId: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
        targetId: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
        source: {
          key: '<%=passed%>',
          anchor: '',
          id: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
          name: '测试通过',
        },
        target: {
          key: '<%=todo%>',
          anchor: '',
          id: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
          name: '测试未开始',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试执行中',
        id: 'conn_GfrNuKdLJu_huvHXxlKwk',
        sourceId: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
        targetId: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
        source: {
          key: '<%=todo%>',
          anchor: '',
          id: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
          name: '测试未开始',
        },
        target: {
          key: '<%=executing%>',
          anchor: '',
          id: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
          name: '测试执行中',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试执行中',
        id: 'conn_JrulW7nRv1_huvHXxlKwk',
        sourceId: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
        targetId: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
        source: {
          key: '<%=failed%>',
          anchor: '',
          id: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
          name: '测试失败',
        },
        target: {
          key: '<%=executing%>',
          anchor: '',
          id: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
          name: '测试执行中',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试执行中',
        id: 'conn_a92NTd5o4q_huvHXxlKwk',
        sourceId: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
        targetId: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
        source: {
          key: '<%=passed%>',
          anchor: '',
          id: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
          name: '测试通过',
        },
        target: {
          key: '<%=executing%>',
          anchor: '',
          id: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
          name: '测试执行中',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试失败',
        id: 'conn_GfrNuKdLJu_JrulW7nRv1',
        sourceId: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
        targetId: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
        source: {
          key: '<%=todo%>',
          anchor: '',
          id: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
          name: '测试未开始',
        },
        target: {
          key: '<%=failed%>',
          anchor: '',
          id: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
          name: '测试失败',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试失败',
        id: 'conn_huvHXxlKwk_JrulW7nRv1',
        sourceId: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
        targetId: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
        source: {
          key: '<%=executing%>',
          anchor: '',
          id: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
          name: '测试执行中',
        },
        target: {
          key: '<%=failed%>',
          anchor: '',
          id: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
          name: '测试失败',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试失败',
        id: 'conn_a92NTd5o4q_JrulW7nRv1',
        sourceId: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
        targetId: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
        source: {
          key: '<%=passed%>',
          anchor: '',
          id: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
          name: '测试通过',
        },
        target: {
          key: '<%=failed%>',
          anchor: '',
          id: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
          name: '测试失败',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试通过',
        id: 'conn_GfrNuKdLJu_a92NTd5o4q',
        sourceId: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
        targetId: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
        source: {
          key: '<%=todo%>',
          anchor: '',
          id: '<%=todo%>-d4d86143-2750-4a24-91f8-d6b7a0621113',
          name: '测试未开始',
        },
        target: {
          key: '<%=passed%>',
          anchor: '',
          id: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
          name: '测试通过',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试通过',
        id: 'conn_huvHXxlKwk_a92NTd5o4q',
        sourceId: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
        targetId: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
        source: {
          key: '<%=executing%>',
          anchor: '',
          id: '<%=executing%>-2472f9c7-3171-4756-9711-b56c98625631',
          name: '测试执行中',
        },
        target: {
          key: '<%=passed%>',
          anchor: '',
          id: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
          name: '测试通过',
        },
        parameters: {},
        isAny: true,
      },
      {
        elementId: '',
        name: '测试通过',
        id: 'conn_JrulW7nRv1_a92NTd5o4q',
        sourceId: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
        targetId: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
        source: {
          key: '<%=failed%>',
          anchor: '',
          id: '<%=failed%>-4545e606-ca76-4fed-aa40-94d18da7edb8',
          name: '测试失败',
        },
        target: {
          key: '<%=passed%>',
          anchor: '',
          id: '<%=passed%>-90b1d09e-fdaf-4210-87ed-0fd8a6a879f9',
          name: '测试通过',
        },
        parameters: {},
        isAny: true,
      },
    ],
  });

  const result = template.replace(/<%=(\w+)%>/g, (_, $1) => {
    console.log(status[$1], status, $1);
    return status[$1];
  });
  return JSON.parse(result);
};

// 测试管理前缀
const getNameByPrefix = name => {
  return {
    name: `测试管理_${name}`,
    description: `测试管理_${name}（忽删）`,
  };
};
// 事项类型标题
const ItemTypeNames = ['测试用例', '测试集合', '测试计划', '测试执行', '前置条件'].map(
  name => getNameByPrefix(name).name,
);
// 状态
const BaseStatues = [
  { name: '测试未开始', type: 'Start', alias: 'todo' },
  { name: '测试执行中', type: 'InProgress', alias: 'executing' },
  { name: '测试通过', type: 'Finished', alias: 'failed' },
  { name: '测试失败', type: 'Finished', alias: 'passed' },
];

const initialScriptRunner = async () => {
  const appInstance = await apis.getData(false, 'App', { key: APP_KEY });
  if (!appInstance) return;

  // 创建获取通用表单字段
  const getCommonFields = () => {
    const { tenant, createdBy } = appInstance.toJSON();
    return {
      tenant,
      createdBy,
    };
  };

  // 事项类型创建
  const createPrepareData = async () => {
    let itemTypes = await apis.getAllData(false, 'ItemType', { key: APP_KEY });
    let statues = await apis.getAllData(false, 'Status', { description: '测试管理_状态' });

    const needCreatedItemTypeNames = ItemTypeNames.filter(name =>
      itemTypes?.every(itemType => itemType.get('name') !== name),
    );
    const needCreatedStatues = BaseStatues.filter(({ name }) =>
      statues?.every(status => status.get('name') !== name),
    );

    // 创建卡片类型
    if (needCreatedItemTypeNames.length) {
      const itemTypeParseObj = await apis.getParseObject(false, 'ItemType');
      const newItemTypes = needCreatedItemTypeNames.map(name => {
        const newItemTypeParseObj = itemTypeParseObj.clone();
        newItemTypeParseObj.set({
          name,
          key: APP_KEY,
          ...getCommonFields(),
        });
        return newItemTypeParseObj;
      });

      const createdItemTypes = await apis.saveAllObject(newItemTypes);
      itemTypes = itemTypes.concat(createdItemTypes);
      console.info('事项列表创建成功');
    }

    // 创建状态
    if (needCreatedStatues.length) {
      const statusParseObj = await apis.getParseObject(false, 'Status');
      const newStatues = needCreatedStatues.map(({ name, type }) => {
        const newStatuesParseObj = statusParseObj.clone();
        newStatuesParseObj.set({
          name,
          type,
          usageWorkflow: [],
          description: '测试管理_状态',
          ...getCommonFields(),
        });
        return newStatuesParseObj;
      });
      const createdItemTypes = await apis.saveAllObject(newStatues);
      statues = statues.concat(createdItemTypes);
      console.info('状态创建成功');
    }

    return {
      itemTypes: itemTypes.map(item => item.toJSON()),
      statues: statues.map(item => item.toJSON()),
    };
  };

  const createWorkspaceTemplate = async ({ itemTypes, statues }) => {
    // 事项类型层级方案
    let itemTypeScheme = await apis.getData(
      false,
      'ItemTypeScheme',
      getNameByPrefix('事项层级方案'),
    );
    if (!itemTypeScheme) {
      // 创建层级方案
      const itemTypeSchemeParseObj = await apis.getParseObject(false, 'ItemTypeScheme');

      itemTypeSchemeParseObj.set({
        ...getCommonFields(),
        ...getNameByPrefix('事项层级方案'),
        hierarchy: JSON.stringify(itemTypes),
      });

      [itemTypeScheme] = await apis.saveAllObject([itemTypeSchemeParseObj]);

      console.info('卡片层级方案创建成功');
    }

    // 空间界面方案
    let [screen, screenScheme] = await Promise.all([
      apis.getData(false, 'Screen', getNameByPrefix('界面')),
      apis.getData(false, 'ScreenScheme', getNameByPrefix('界面方案')),
    ]);
    if (!screen) {
      const screenParseObj = await apis.getParseObject(false, 'Screen');

      await screenParseObj.set({
        ...getCommonFields(),
        ...getNameByPrefix('界面'),
      });

      [screen] = await apis.saveAllObject([screenParseObj]);
      console.info('界面创建成功');
    }
    if (!screenScheme) {
      const screenSchemeParseObj = await apis.getParseObject(false, 'ScreenScheme');
      screenSchemeParseObj.set({
        ...getCommonFields(),
        ...getNameByPrefix('界面方案'),
        defaultScreen: screen,
      });

      [screenScheme] = await apis.saveAllObject([screenSchemeParseObj]);
      console.info('界面方案创建成功');
    }

    // 空间工作流方案
    let [workflow, workflowSchema] = await Promise.all([
      apis.getData(false, 'Workflow', getNameByPrefix('工作流')),
      apis.getData(false, 'WorkflowScheme', getNameByPrefix('工作流方案')),
    ]);

    if (!workflow) {
      const getStatusIdByAlias = alias => {
        const name = BaseStatues.find(status => status.alias === alias).name;
        return statues.find(status => status.name === name).objectId;
      };
      const parseObj = await apis.getParseObject(false, 'Workflow');
      parseObj.set({
        ...getCommonFields(),
        ...getNameByPrefix('工作流'),
        ...getWorkFlowFieldByTemplate({
          todo: getStatusIdByAlias('todo'),
          executing: getStatusIdByAlias('executing'),
          failed: getStatusIdByAlias('failed'),
          passed: getStatusIdByAlias('passed'),
        }),
      });

      [workflow] = await apis.saveAllObject([parseObj]);
      console.info('界面方案创建成功');
    }

    // if (!workflowSchema) {
    //   const parseObj = await apis.getParseObject(false, 'WorkflowSchema');
    //   parseObj.set({
    //     ...getCommonFields(),
    //     ...getNameByPrefix('工作流方案'),
    //   });

    //   [workflowSchema] = await apis.saveAllObject([parseObj]);
    //   console.info('工作流方案创建成功');
    // }
  };

  createPrepareData().then(
    preparedData => {
      return createWorkspaceTemplate(preparedData);
    },
    () => { },
  );
};

initialScriptRunner().then(() => {
  console.info('测试管理插件初始化成功');
});
