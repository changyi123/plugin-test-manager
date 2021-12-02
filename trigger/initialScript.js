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
    return status[$1];
  });
  return JSON.parse(result);
};

// 测试管理前缀
const getNameByPrefix = name => {
  return {
    name: `测试管理_${name}`,
    description: `测试管理_${name}（忽改）`,
  };
};
// 事项类型标题
const BaseItemTypes = [
  { name: '测试用例', alias: 'testCase' },
  {
    name: '测试集合',
    alias: 'testSet',
  },
  { name: '测试计划', alias: 'testPlan' },
  {
    name: '测试执行',
    alias: 'testExecution',
  },
  {
    name: '前置条件',
    alias: 'preCondition',
  },
];
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

  // 前置数据创建（事项类型，状态）
  const createPrepareData = async () => {
    let itemTypes = await apis.getAllData(false, 'ItemType', { key: APP_KEY });
    let statues = await apis.getAllData(false, 'Status', { description: '测试管理_状态' });

    const BaseItemTypeNames = BaseItemTypes.map(({ name }) => getNameByPrefix(name).name);
    const needCreatedItemTypeNames = BaseItemTypeNames.filter(name =>
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
      itemTypes,
      statues,
    };
  };

  const createWorkspaceTemplate = async ({ itemTypes, statues }) => {
    // 查询空间配置方案，如果有则直接返回
    let workspaceScheme = await apis.getData(
      false,
      'WorkspaceScheme',
      getNameByPrefix('空间配置方案'),
    );
    if (workspaceScheme) return workspaceScheme;
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
        hierarchy: JSON.stringify(itemTypes.map(item => item.toJSON())),
      });

      [itemTypeScheme] = await apis.saveAllObject([itemTypeSchemeParseObj]);

      console.info('卡片层级方案创建成功');
    }

    // 空间界面方案
    let [screen, screenScheme, itemTypeScreenScheme] = await Promise.all([
      apis.getData(false, 'Screen', getNameByPrefix('界面')),
      apis.getData(false, 'ScreenScheme', getNameByPrefix('界面方案')),
      apis.getData(false, 'ItemTypeScreenScheme', getNameByPrefix('事项类型界面方案')),
    ]);

    if (!screen) {
      const screenParseObj = await apis.getParseObject(false, 'Screen');

      await screenParseObj.set({
        ...getCommonFields(),
        ...getNameByPrefix('界面'),
        layout: {
          // 初始化使用一个空占位
          _id: '_c_root__uuid',
          component: '_c_root',
          children: [],
        },
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

    if (!itemTypeScreenScheme) {
      const parseObject = await apis.getParseObject(false, 'ItemTypeScreenScheme');
      parseObject.set({
        ...getCommonFields(),
        ...getNameByPrefix('事项类型界面方案'),
        defaultScreenScheme: screenScheme,
      });

      [itemTypeScreenScheme] = await apis.saveAllObject([parseObject]);

      console.info('事项类型界面方案创建成功');
    }

    // 空间工作流方案
    let [workflow, workflowScheme] = await Promise.all([
      apis.getData(false, 'Workflow', getNameByPrefix('工作流')),
      apis.getData(false, 'WorkflowScheme', getNameByPrefix('工作流方案')),
    ]);

    if (!workflow) {
      const getStatusByAlias = alias => {
        const name = BaseStatues.find(status => status.alias === alias).name;
        const status = statues.find(status => status.get('name') === name);
        return status.get('objectId');
      };
      const parseObj = await apis.getParseObject(false, 'Workflow');
      parseObj.set({
        releaseStatus: true,
        ...getCommonFields(),
        ...getNameByPrefix('工作流'),
        ...getWorkFlowFieldByTemplate({
          todo: getStatusByAlias('todo'),
          executing: getStatusByAlias('executing'),
          failed: getStatusByAlias('failed'),
          passed: getStatusByAlias('passed'),
        }),
      });

      [workflow] = await apis.saveAllObject([parseObj]);
      console.info('界面方案创建成功');
    }

    if (!workflowScheme) {
      const workflowSchemeParseObj = await apis.getParseObject(false, 'WorkflowScheme');
      const workflowSchemeConfigParseObj = await apis.getParseObject(false, 'WorkflowSchemeConfig');

      workflowSchemeParseObj.set({
        ...getCommonFields(),
        ...getNameByPrefix('工作流方案'),
      });

      [workflowScheme] = await apis.saveAllObject([workflowSchemeParseObj]);
      console.info('工作流方案创建成功');

      // 工作流方案绑定工作流
      const workflowSchemeConfigParseObjs = itemTypes.map(itemType => {
        const newWorkflowSchemeConfigParseObj = workflowSchemeConfigParseObj.clone();
        newWorkflowSchemeConfigParseObj.set({
          ...getCommonFields(),
          workflow,
          itemType,
          workflowScheme,
        });
        return newWorkflowSchemeConfigParseObj;
      });

      await apis.saveAllObject([workflowSchemeConfigParseObjs]);
      console.info('工作流方案绑定成功');
    }

    console.info('itemTypeScreenScheme', itemTypeScreenScheme);

    if (!workspaceScheme) {
      const parseObj = await apis.getParseObject(false, 'WorkspaceScheme');

      parseObj.set({
        ...getCommonFields(),
        ...getNameByPrefix('空间配置方案'),
        itemTypeScheme,
        workflowScheme,
        itemTypeScreenScheme,
      });

      [workspaceScheme] = await apis.saveAllObject([parseObj]);
      console.info('空间配置方案创建成功');
    }

    return workspaceScheme;
  };

  // 创建空间
  const createWorkspace = async ({ workspaceScheme }) => {
    let workspace = await apis.getData(false, 'Workspace', { key: 'TEST_MANAGER' });

    if (!workspace) {
      const parseObj = await apis.getParseObject(false, 'Workspace');

      parseObj.set({
        key: 'TEST_MANAGER',
        workspaceScheme,
        ...getNameByPrefix('空间'),
        ...getCommonFields(),
      });

      [workspace] = await apis.saveAllObject([parseObj]);
      console.info('界面创建成功');
    }

    return workspace;
  };

  // 建立关联关系
  const createRelationWithTestConfig = async ({ itemTypes, workspace }) => {
    const testConfig = await apis.getData(true, 'TestConfig', { workspace });
    if (!testConfig) {
      const parseObj = await apis.getParseObject(true, 'TestConfig');
      parseObj.set({
        ...getCommonFields(),
      });
    }
  };

  createPrepareData()
    .then(async preparedData => {
      const workspaceScheme = await createWorkspaceTemplate(preparedData);
      return {
        workspaceScheme,
        ...preparedData,
      };
    })
    .then(async ({ workspaceScheme, itemTypes }) => {
      const workspace = await createWorkspace(workspaceScheme);
      return createRelationWithTestConfig({
        itemTypes,
        workspace,
      });
    });
};

initialScriptRunner().then(() => {
  console.info('测试管理插件初始化成功');
});
