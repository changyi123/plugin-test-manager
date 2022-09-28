import {
  getData,
  getParseObject,
  saveAllObject,
  getAppsData,
  pgClient,
} from '@giteeteam/apps-team-api';

const log = (msg, ...restArgs) => {
  console.info(`[testManager] ${msg}`, ...restArgs);
};

// const pluginClassPrefix = 'plugin_';
const pluginClassPrefix = '';

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
    name: '正在执行',
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

let MaxExecuteTimes = 5;
const executeSQL = async () => {
  const createTestRelationTableUniqueSQL = async () => {
    const createUniqueSQL = `
      CREATE UNIQUE INDEX IF NOT EXISTS ${pluginClassPrefix}test_manager_test_relation_table_from_to_unique ON "${pluginClassPrefix}test_manager_TestRelation" ("from",
      "to",
      "relationType");
  `;

    const deleteDuplicateRelationRowIfExists = async () => {
      // 查走重复列数据
      const queryDuplicateRelationRowSQL = `
        SELECT max("objectId")
        FROM "${pluginClassPrefix}test_manager_TestRelation"
        GROUP BY "from",
                "to",
                "relationType"
        HAVING count(*) > 1
      `;

      const deleteDuplicateRelationRowSQL = `
        DELETE
        FROM "${pluginClassPrefix}test_manager_TestRelation"
        WHERE "objectId" in (${queryDuplicateRelationRowSQL});
      `;

      const result = await pgClient.query(queryDuplicateRelationRowSQL);

      if (MaxExecuteTimes > 0 && result?.rowCount) {
        MaxExecuteTimes -= 1;
        // 删除重复列数据
        await pgClient.query(deleteDuplicateRelationRowSQL);
        await deleteDuplicateRelationRowIfExists();
      }
      return;
    };

    try {
      await deleteDuplicateRelationRowIfExists();
      await pgClient.query(createUniqueSQL);
      log('关联关系表唯一索引创建成功');
    } catch (err) {
      log('createUniqueSQL run error', err);
    }
  };

  try {
    log('开始执行插件 SQL 脚本');
    await createTestRelationTableUniqueSQL();
  } catch (err) {
    log('createUniqueSQL run error', err);
  }
};

const initialScriptRunner = async () => {
  const APP_KEY = global.appKey ?? 'test_manager';

  const TestConfigClass = `TestConfig`;

  log('开始执行测试管理初始化脚本');

  const appInstance = await getAppsData('Apps', { key: APP_KEY });
  if (!appInstance) return;

  // 测试管理全局配置
  const globalTestConfig = await getOrCreateParseObject(true, TestConfigClass, {
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

  await saveAllObject([globalTestConfig]);
};

export const runInitialScript = async () => {
  try {
    await initialScriptRunner()
      .then(() => executeSQL())
      .then(() => {
        log('测试管理插件初始化成功');
      });
  } catch (error) {
    log('error:', error);
  }
};
