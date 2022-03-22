const APP_KEY = 'test_manager';

const TestConfigClass = `${APP_KEY}_TestConfig`;

// 内置状态配置
const initializedStatuses = [
  {
    key: 'PASSED',
    name: '通过',
    type: 'PASSED',
    color: '#36B37E',
    final: true,
    native: true,
    readOnly: true,
    description: '测试执行通过',
  },
  {
    key: 'TODO',
    name: '未开始',
    type: 'TODO',
    color: '#B0B5BC',
    final: false,
    native: true,
    readOnly: true,
    description: '测试执行未开始',
  },
  {
    key: 'EXECUTING',
    name: '正在执行',
    type: 'EXECUTING',
    color: '#FFAB00',
    final: false,
    native: true,
    readOnly: true,
    description: '测试执行正在执行中',
  },
  {
    key: 'FAILED',
    name: '失败',
    type: 'FAILED',
    color: '#FF7452',
    final: true,
    native: true,
    readOnly: true,
    description: '测试执行失败',
  },
];

// 获取 parseObject，不存在则创建 (单条数据)
const getOrCreateParseObject = async (parseClass, attributes) => {
  let parseObject = await apis.getData(false, parseClass, attributes);
  if (!parseObject) {
    const newParseObject = await apis.getParseObject(false, parseClass);
    newParseObject.set(attributes);
    [parseObject] = await apis.saveAllObject([newParseObject]);
  }
  return parseObject;
};

const initialScriptRunner = async () => {
  const appInstance = await apis.getData(false, 'App', { key: APP_KEY });
  if (!appInstance) return;

  // 测试管理全局配置
  const globalTestConfig = await getOrCreateParseObject(TestConfigClass, {
    global: true,
  });

  // 测试管理全局配置数据
  let globalTestConfigData = globalTestConfig.get('extra') || {};
  // 存储测试管理配置数据
  const saveGlobalTestConfigData = data => {
    globalTestConfigData = Object.assign({}, globalTestConfigData, data);
  };

  if (!globalTestConfigData.statuses) {
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

    const itemLinkType = await getOrCreateParseObject('ItemLinkType', itemLinkTypeAttributes);

    saveGlobalTestConfigData({
      itemLinkTypeMapping: {
        TestToDefect: itemLinkType?.toJSON()?.objectId,
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

  await apis.saveAllObject([globalTestConfig]);
};

initialScriptRunner().then(() => {
  console.info('测试管理插件初始化成功');
});
