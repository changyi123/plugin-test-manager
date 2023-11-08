import {
  getAppsData,
  getData,
  getParseObject,
  getParseQuery,
  saveAllObject,
} from '@giteeteam/apps-team-api';

// import keyBy from 'lodash/keyBy';
import { TestConfigClassName } from '../../../common/constant';
import { BuiltInInitializationStages, Initialization } from '../../lib/initialization';
// import { batchCreateChartGroups } from '../web/script/create-chart-groups';

// const ParseBaseQueryOptions = {
//   sessionToken: global.sessionToken,
// };

const log = (msg, ...restArgs) => {
  console.info(`[testManager] ${msg}`, ...restArgs);
};

// 内置状态配置
const initializedStatuses = [
  {
    key: 'PASSED',
    name: '通过',
    type: 'PASSED',
    color: '#29C477',
    final: true,
    native: true,
    readOnly: true,
    description: '测试执行通过',
  },
  {
    key: 'TODO',
    name: '未开始',
    type: 'TODO',
    color: '#3683FF',
    final: false,
    native: true,
    readOnly: true,
    description: '测试执行未开始',
  },
  {
    key: 'EXECUTING',
    name: '执行中',
    type: 'EXECUTING',
    color: '#FFBF36',
    final: false,
    native: true,
    readOnly: true,
    description: '测试执行正在执行中',
  },
  {
    key: 'FAILED',
    name: '失败',
    type: 'FAILED',
    color: '#FF7236',
    final: true,
    native: true,
    readOnly: true,
    description: '测试执行失败',
  },
  {
    key: 'BLOCK',
    name: '阻塞',
    type: 'BLOCK',
    color: '#846BFF',
    final: false,
    native: true,
    readOnly: true,
    description: '测试执行阻塞',
  },
  {
    key: 'CANCEL',
    name: '已取消',
    type: 'CANCEL',
    color: '#B5BAC5',
    final: false,
    native: true,
    readOnly: true,
    description: '测试执行已取消',
  },
];

// 获取 parseObject，不存在则创建 (单条数据)
const getOrCreateParseObject = async (isAppClass, parseClass, attributes) => {
  const parseData = await getData(isAppClass, parseClass, attributes);
  if (!parseData) {
    const newParseObject = getParseObject(isAppClass, parseClass);
    newParseObject.set(attributes);
    const [parseObject] = await saveAllObject([newParseObject]);
    return parseObject;
  }
  return parseData;
};

const APP_KEY = 'test_manager';

/**
// 生成面板的 name，可以通过 objectId 标识与对应的测试计划配置关联
const generateBoardName = testConfigObjectId => `test_manager_defect_board_${testConfigObjectId}`;

// 生成 pointer 数据
const toPointer = (className, objectId) => ({
  className,
  objectId,
  __type: 'Pointer',
});

// 新建测试缺陷面板并关联面板至测试配置
const createNotExistedTestDefectBoard = async () => {
  const [testConfigQuery, workspaceQuery, itemTypeQuery] = await Promise.all([
    getParseQuery(false, TestConfigClassName),
    getParseQuery(false, 'Workspace'),
    getParseQuery(false, 'ItemType'),
  ]);

  const notExistedDefectBoardConfigs = await testConfigQuery
    .doesNotExist('defectBoard')
    .findAll(ParseBaseQueryOptions);

  const workspaceKeys = notExistedDefectBoardConfigs
    .map(config => config.get('workspaceKey'))
    .filter(Boolean);

  const [workspaces, statuses] = await Promise.all([
    workspaceQuery
      .containedIn('key', workspaceKeys)
      .select(['objectId', 'key'])
      .findAll(ParseBaseQueryOptions)
      .then(items => items.map(item => item.toJSON())),
    itemTypeQuery
      .select(['objectId', 'key', 'name'])
      .findAll(ParseBaseQueryOptions)
      .then(items => items.map(item => item.toJSON())),
  ]);

  const itemTypeKeyMapping = keyBy(statuses, 'key');
  const workspaceKeyMapping = keyBy(workspaces, 'key');

  const boards = Array.from(Array(notExistedDefectBoardConfigs.length), (_, index) => {
    const boardObject = getParseObject(false, 'Board');
    const testConfig = notExistedDefectBoardConfigs[index].toJSON();
    const workspace = workspaceKeyMapping[testConfig.workspaceKey];

    // 如果空间已经被删除则不处理该数据
    if (!workspace) return;

    const defectsMapping = testConfig.defectsMapping ?? [];

    // 缺陷是否空间隔离
    const isIsolateDefect = testConfig.isolateTestType?.includes('TestDefect');

    // TODO: 后期处理 iql 国际化
    const itemTypeSubIql = `类型 in [${defectsMapping
      .filter(key => itemTypeKeyMapping[key]?.name)
      .map(key => `'${itemTypeKeyMapping[key].name}'`)
      .join(',')}]`;

    // 空间查询
    const workspaceSubIql = isIsolateDefect
      ? `'workspaceKey' = '${testConfig.workspaceKey}'`
      : null;

    const iql = workspaceSubIql ? `(${itemTypeSubIql}) and (${workspaceSubIql})` : itemTypeSubIql;
    const itemTypes = defectsMapping
      .map(key => toPointer('ItemType', itemTypeKeyMapping[key]?.objectId))
      .filter(item => item.objectId);

    boardObject.set({
      iql,
      // 限制创建的类型
      itemTypes,
      hidden: true,
      icon: 'Panel1',
      filterSource: 'inWorkspace',
      // 使用 testConfig objectId 作为 name 避免重复
      name: generateBoardName(testConfig.objectId),
      workspace: toPointer('Workspace', workspace.objectId),
    });

    return boardObject;
  }).filter(Boolean);

  const createdBoardData = await saveAllObject(boards).then(items =>
    items.map(item => item.toJSON()),
  );

  // 将新建的 board 数据和 testConfig 配置数据及逆行关联
  const testConfigObjects = notExistedDefectBoardConfigs
    .map(testConfigObj => {
      const testConfigObjectId = testConfigObj.get('objectId');
      const defectBoardData = createdBoardData.find(
        board => generateBoardName(testConfigObjectId) === board.name,
      );

      // workspaceKey 不存在的话就不会创建 board 数据，需要判断 board 是否创建
      if (!defectBoardData) return;

      // console.log('defectBoard', testConfigObjectId, defectBoardData);
      testConfigObj.set({
        defectBoard: toPointer('Board', defectBoardData.objectId),
        displayDefectBoard: true,
      });

      return testConfigObj;
    })
    .filter(Boolean);

  const updatedTestConfigs = await saveAllObject(testConfigObjects);

  console.info('updatedTestConfigs', updatedTestConfigs);
};
 * // 新建测试统计报表
const createNotExistedChartGroups = async () => {
  const [testConfigQuery, workspaceQuery] = await Promise.all([
    getParseQuery(false, TestConfigClassName),
    getParseQuery(false, 'Workspace'),
  ]);

  const notExistedChartGroupConfigs = await testConfigQuery
    .doesNotExist('chartGroups')
    .findAll(ParseBaseQueryOptions);
  const testConfigMap = keyBy(notExistedChartGroupConfigs, item => item.get('workspaceKey'));

  const workspaceKeys = notExistedChartGroupConfigs
    .map(config => config.get('workspaceKey'))
    .filter(Boolean);

  const workspaceMap = await workspaceQuery
    .containedIn('key', workspaceKeys)
    .findAll(ParseBaseQueryOptions)
    .then(items => keyBy(items, item => item.get('key')));

  const needToCreateWOrkspaceKey = workspaceKeys.filter(key => workspaceMap[key]).filter(Boolean);

  if (needToCreateWOrkspaceKey?.length) {
    // 获取创建的 chartGroups
    const chartGroupMapValues = await batchCreateChartGroups(
      needToCreateWOrkspaceKey.map(workspaceKey => ({
        workspace: workspaceMap[workspaceKey],
        defectsMapping: (testConfigMap[workspaceKey] as any)?.get('defectsMapping'),
      })),
    );

    const testConfigObjects = needToCreateWOrkspaceKey.map(workspaceKey => {
      const testConfig = notExistedChartGroupConfigs.find(
        config => config.get('workspaceKey') === workspaceKey,
      );

      const chartGroupMapValue = chartGroupMapValues.find(
        group => group.workspaceKey === workspaceKey,
      );

      testConfig.set({
        chartGroups: {
          ...(testConfig.get('chartGroups') ?? {}),
          ...chartGroupMapValue.chartGroups,
        },
      });

      return testConfig;
    });

    const updatedTestConfigs = await saveAllObject(testConfigObjects);
    console.info('updatedTestConfigs', updatedTestConfigs);
  }
};

// 创建测试管理用例执行统计报表
const createTestCountChartGroups = async () => {
  const [testConfigQuery, workspaceQuery] = await Promise.all([
    getParseQuery(false, TestConfigClassName),
    getParseQuery(false, 'Workspace'),
  ]);

  const notExistedChartGroupConfigs = await testConfigQuery
    .findAll(ParseBaseQueryOptions)
    .then(items =>
      items
        .filter(item => item.get('chartGroups'))
        .filter(item => !item.get('chartGroups')?.TestRunCountChartGroup),
    );

  const workspaceKeys = notExistedChartGroupConfigs
    .map(config => config.get('workspaceKey'))
    .filter(Boolean);

  const workspaceMap = await workspaceQuery
    .containedIn('key', workspaceKeys)
    .findAll(ParseBaseQueryOptions)
    .then(items => keyBy(items, item => item.get('key')));

  const needToCreateWOrkspaceKey = workspaceKeys.filter(key => workspaceMap[key]).filter(Boolean);

  if (needToCreateWOrkspaceKey?.length) {
    // 获取创建的 chartGroups
    const chartGroupMapValues = await batchCreateChartGroups(
      needToCreateWOrkspaceKey.map(workspaceKey => ({
        workspace: workspaceMap[workspaceKey],
        needToCreateGroupKeys: ['TestRunCountChartGroup'],
      })),
    );
    console.info('将 chartGroups 绑定空间 testConfig 开始 ------------------->');

    const testConfigObjects = needToCreateWOrkspaceKey.map(workspaceKey => {
      const testConfig = notExistedChartGroupConfigs.find(
        config => config.get('workspaceKey') === workspaceKey,
      );

      const chartGroupMapValue = chartGroupMapValues.find(
        group => group.workspaceKey === workspaceKey,
      );

      testConfig.set({
        chartGroups: {
          ...(testConfig.get('chartGroups') ?? {}),
          ...chartGroupMapValue.chartGroups,
        },
      });

      return testConfig;
    });
    console.info('将 chartGroups 绑定空间 testConfig 过程中 ------------------->');

    const updatedTestConfigs = await saveAllObject(testConfigObjects);
    console.info('将 chartGroups 绑定空间 testConfig 结束 ------------------->');
    console.info('updatedTestConfigs', updatedTestConfigs);
  }
};
*/

const initGlobalTestConfig = async () => {
  log('开始执行测试管理初始化脚本');

  const appInstance = await getAppsData('Apps', { key: APP_KEY });
  if (!appInstance) return;

  // 测试管理配置修改标识
  let isGlobalTestConfigDirty = false;

  // 测试管理全局配置
  const globalTestConfig = await getOrCreateParseObject(false, TestConfigClassName, {
    global: true,
  });

  // 测试管理全局配置数据
  let globalTestConfigData = globalTestConfig.get('extra') || {};
  // 存储测试管理配置数据
  const saveGlobalTestConfigData = data => {
    globalTestConfigData = Object.assign({}, globalTestConfigData, data);
    isGlobalTestConfigDirty = true;
  };

  // 校验执行状态长度是否一致，不一致则更新
  if (globalTestConfigData?.statuses?.length !== initializedStatuses.length) {
    saveGlobalTestConfigData({
      statuses: initializedStatuses,
    });
  }

  // FIXME: 增加 skip 标识，强刷数据。下个版本移除。作用：itemTypeLink key -> objectId
  const SKIP_FLAG = true;
  if (SKIP_FLAG || !globalTestConfigData.itemLinkTypeMapping) {
    const itemLinkTypeAttributes = {
      key: 'TD',
      outward: '缺陷',
      isSystem: true,
      type: 'manyToMany',
      inwardItemType: 'all',
      outwardItemType: 'all',
      inward: '测试用例/执行轮次',
      name: '测试管理缺陷关联',
    };

    const itemLinkType = await getOrCreateParseObject(
      false,
      'ItemLinkType',
      itemLinkTypeAttributes,
    );

    saveGlobalTestConfigData({
      itemLinkTypeMapping: {
        TestToDefect: itemLinkType?.get('objectId'),
      },
    });
  }

  if (!globalTestConfigData.builtInItemType) {
    // TODO: 内置事项类型
  }

  globalTestConfig.set({
    extra: globalTestConfigData,
  });

  console.info('测试管理插件全局配置', globalTestConfigData);

  if (isGlobalTestConfigDirty) {
    await saveAllObject([globalTestConfig as any]);
  }
};

const initWorkspaceTestConfigs = async () => {
  const ParseBaseQueryOptions = {
    // sessionToken: global.sessionToken,
    useMasterKey: true,
  };

  // 获取所有空间
  const [appWorkspace] = await Promise.all([
    getParseQuery(false, 'AppsWorkspace')
      .equalTo('appKey', APP_KEY)
      .equalTo('environmentKey', 'production')
      .include('workspaces')
      .first(ParseBaseQueryOptions)
      .then(data => data.toJSON()),
  ]);

  let installedWorkspaceKeys = [];
  const isGlobalPlugin = !!appWorkspace.global;

  if (isGlobalPlugin) {
    // 获取租户下所有空间
    installedWorkspaceKeys = await getParseQuery(false, 'Workspace')
      .select(['objectId', 'key'])
      .findAll(ParseBaseQueryOptions)
      .then(data => data.map(item => item.get('key')));
  } else {
    installedWorkspaceKeys = appWorkspace?.workspaces
      ?.map(workspace => workspace?.key ?? workspace)
      .filter(Boolean);
  }

  console.info('installedWorkspaceKeys_______________', isGlobalPlugin, installedWorkspaceKeys);

  const initialization = new Initialization(
    [BuiltInInitializationStages.initTestConfig, BuiltInInitializationStages.initChartOption],
    {
      workspaceKeys: installedWorkspaceKeys,
    },
  );

  if (installedWorkspaceKeys.length) {
    await initialization.init();
  }
};

const executeSQL = async () => {
  const { rows: ids } = await pgClient.query(`select cg."objectId"
  from "ChartGroup" cg
  where cg.key = 'test_manager'
    and cg."objectId" not in (
      select cfg."chartGroups" -> 'TestDefectChartGroup' ->> 'chartGroup'
      from "test_manager_TestConfig" cfg
      where cfg."chartGroups" -> 'TestDefectChartGroup' is not null
      union
      select cfg."chartGroups" -> 'TestRunCountChartGroup' ->> 'chartGroup'
      from "test_manager_TestConfig" cfg
      where cfg."chartGroups" -> 'TestRunCountChartGroup' is not null)`);
  console.info('ids ---------------->', ids);
  if (!ids?.length) return;

  const deleteChartSQL = `delete from "Chart" where "chartGroup" in (${ids
    .map(d => `'${d.objectId}'`)
    .join(',')})`;

  const deleteChartGroupSQL = `delete from "ChartGroup" where key = 'test_manager' and "objectId" in (${ids
    .map(d => `'${d.objectId}'`)
    .join(',')})`;
  console.info('deleteChartSQL ---------------->', deleteChartSQL);
  console.info('deleteChartGroupSQL -------------------->', deleteChartGroupSQL);

  await pgClient.query(deleteChartSQL);
  await pgClient.query(deleteChartGroupSQL);
  return;
};

export const runInitialScript = async () => {
  try {
    await initGlobalTestConfig()
      .then(() => initWorkspaceTestConfigs())
      // .then(() => executeSQL())
      .then(() => {
        log('测试管理插件初始化成功');
      });
  } catch (error) {
    log('error:', error);
  }
};
