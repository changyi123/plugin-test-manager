import { getParseModel, getParseQuery, saveAllObject } from '@giteeteam/apps-team-api';

import { batchCreateChartGroups } from '../modules/web/script/create-chart-groups';

const Constants = {
  TestManagerAppKey: 'test_manager',
  ProductionEnvironmentKey: 'production',
  BuiltInItemTypeKeys: [
    'test_manager_plan',
    'test_manager_detail',
    'test_manager_execution',
  ] as const,
  ModelNames: {
    TestConfig: 'test_manager_TestConfig',
    Workspace: 'Workspace',
    ItemType: 'ItemType',
    ItemTypeScheme: 'ItemTypeScheme',
    AppsWorkspace: 'AppsWorkspace',
    ChartGroup: 'ChartGroup',
    Chart: 'Chart',
  } as const,
} as const;

const helper = {
  logger: (...messages) => {
    const LogSplit = '\t||\t';

    // eslint-disable-next-line no-console
    console.log(
      `[test-manager-initialization]: ${messages.reduce(
        (ret, message, index) =>
          ret +
          (index ? LogSplit : '') +
          (typeof message === 'object' ? JSON.stringify(message) : message),
        '\t',
      )}`,
    );
  },
  getParseBaseQueryOptions: () => ({
    sessionToken: global.sessionToken,
  }),
};

const dataFetcher = {
  // 获取内置事项类型
  getBuiltInItemType: async () => {
    const ParseBaseQueryOptions = helper.getParseBaseQueryOptions();

    const itemTypeQuery = await getParseQuery(false, Constants.ModelNames.ItemType);
    const builtInItemTypes = await itemTypeQuery
      .containedIn('key', Constants.BuiltInItemTypeKeys)
      .select(['key', 'name', 'objectId', 'icon'])
      .find({
        context: {
          displayModule: 'plugin.testManager',
        },
        ...ParseBaseQueryOptions,
      })
      .then(data => data.map(i => i.toJSON()));

    return builtInItemTypes;
  },
  // 获取空间配置信息
  getWorkspaceInfos: async workspaceKeys => {
    const ParseBaseQueryOptions = helper.getParseBaseQueryOptions();

    const workspaceQuery = await getParseQuery(false, Constants.ModelNames.Workspace);

    const workspaces = await workspaceQuery
      .containedIn('key', workspaceKeys)
      .select(['key', 'itemTypeScheme', 'testConfig'])
      .include(['itemTypeScheme'])
      .find(ParseBaseQueryOptions)
      .then(data => data.map(i => i.toJSON()));

    return workspaces;
  },
  getTestConfigs: async workspaceKeys => {
    const ParseBaseQueryOptions = helper.getParseBaseQueryOptions();
    const testConfigQuery = await getParseQuery(false, Constants.ModelNames.TestConfig);
    return testConfigQuery
      .containedIn('workspaceKey', workspaceKeys)
      .select(['itemTypeMap', 'workspaceKey', 'objectId'])
      .limit(workspaceKeys.length)
      .find(ParseBaseQueryOptions)
      .then(data => data?.map(i => i.toJSON()));
  },
  // 获取全局配置
  getGlobalTestConfig: async () => {
    const ParseBaseQueryOptions = helper.getParseBaseQueryOptions();

    const testConfigQuery = await getParseQuery(false, Constants.ModelNames.TestConfig);
    const globalTestConfig = await testConfigQuery
      .equalTo('global', true)
      .first(ParseBaseQueryOptions)
      .then(data => data?.toJSON());

    return globalTestConfig;
  },
  // 获取已经安装插件的空间，可根据参数进行过滤
  getInstalledWorkspaceKeys: async (workspaceKeys?: string[]) => {
    const ParseBaseQueryOptions = helper.getParseBaseQueryOptions();
    const [appsWorkspaceQuery, workspaceQuery] = await Promise.all([
      getParseQuery(false, Constants.ModelNames.AppsWorkspace),
      getParseQuery(false, Constants.ModelNames.Workspace),
    ]);

    const tasks = [
      appsWorkspaceQuery
        .equalTo('appKey', Constants.TestManagerAppKey)
        .equalTo('environmentKey', Constants.ProductionEnvironmentKey)
        .include('workspaces')
        .select(['global', 'workspaces'])
        .first(ParseBaseQueryOptions)
        .then(i => i?.toJSON()) as any,

      !Array.isArray(workspaceKeys) &&
        workspaceQuery
          .select(['key'])
          .findAll(ParseBaseQueryOptions)
          .then(i => i.map(i => i.get('key'))),
    ].filter(Boolean);

    const [appsWorkspace, allWorkspaceKeys] = await Promise.all(tasks);
    workspaceKeys = allWorkspaceKeys ?? workspaceKeys;

    // 全局配置，所有空间都需要处理
    if (appsWorkspace.global) return workspaceKeys;

    const pluginIsInstalledWorkspaceKeys = appsWorkspace.workspaces.map(w => w?.key ?? w);

    return workspaceKeys.filter(key => pluginIsInstalledWorkspaceKeys.includes(key));
  },
};

export type InitializationStage = {
  key: string;
  canExecute?: (instance: Initialization) => Promise<
    | boolean
    | {
        canExecute: boolean;
        data?: any;
      }
  >;
  function: (instance: Initialization, prevData?: any) => Promise<void>;
};

/** 初始化配置 */
export type InitializationOptions = {
  /** 是否允许阶段执行失败 */
  allowStageExecuteFailure?: boolean;
  /** 需要初始化的空间标识 */
  workspaceKeys?: string[];
  /** 是否初始化所有空间 */
  initAllWorkspace?: boolean;
  /** 禁用自动初始化 */
  disableAutoInitCheck?: boolean;
  /** 禁止更新 itemTypeMap 数据 */
  disableUpdateItemTypeMap?: boolean;
};

// 测试管理配置数据初始化 class
export class Initialization {
  private configStorage = {};

  private stages: InitializationStage[] = [];

  options = {} as InitializationOptions;
  workspaceKeys = [];

  constructor(stages, options?: InitializationOptions) {
    this.stages = stages;

    if (Array.isArray(options.workspaceKeys)) {
      this.workspaceKeys = options.workspaceKeys;
    }

    if (options) {
      this.options = options;
    }
  }

  addConfigStorage = (key, value?: any) => {
    if (key && typeof key === 'object') {
      this.configStorage = Object.assign({}, this.configStorage, key);
    } else {
      this.configStorage[key] = value;
    }
  };
  getConfigStorage = key => {
    return this.configStorage[key];
  };

  init = async () => {
    // 需要初始化的空间标识
    this.workspaceKeys = await dataFetcher.getInstalledWorkspaceKeys(
      this.options.initAllWorkspace ? null : this.workspaceKeys,
    );

    if (!this.workspaceKeys.length) throw new Error('没有需要初始化的空间');
    // 初始化空间配置数据
    const [testConfigs, workspaces, globalTestConfig] = await Promise.all([
      dataFetcher.getTestConfigs(this.workspaceKeys),
      dataFetcher.getWorkspaceInfos(this.workspaceKeys),
      dataFetcher.getGlobalTestConfig(),
    ]);

    this.addConfigStorage({
      workspaces,
      testConfigs,
      globalTestConfig,
    });

    for (const stage of this.stages) {
      helper.logger('stage executing...', stage.key);
      try {
        const canExecuteResult =
          typeof stage.canExecute === 'function' ? await stage.canExecute(this) : true;
        let canExecute = canExecuteResult,
          canExecuteData;
        if (typeof canExecuteResult === 'object') {
          canExecute = canExecuteResult?.canExecute ?? true;
          canExecuteData = canExecuteResult.data;
        }
        if (canExecute) {
          await stage.function(this, canExecuteData);
        }
      } catch (err) {
        helper.logger('stage execute error', stage.key);
        if (!this.options.allowStageExecuteFailure) {
          throw err;
        }
      }
    }
  };
}

// 内置的初始化阶段
export const BuiltInInitializationStages: Record<string, InitializationStage> = {
  // 初始化测试管理配置数据
  initTestConfig: {
    key: 'initTestConfig',
    canExecute: async instance => {
      const { getConfigStorage } = instance;
      const workspaces = getConfigStorage('workspaces');
      const testConfigs = getConfigStorage('testConfigs');
      const globalTestConfig = getConfigStorage('globalTestConfig');

      if (
        !instance.options.disableAutoInitCheck &&
        // 如果全局配置中关闭了自动初始化的配置开关，不需要执行初始化脚本
        !globalTestConfig.extra?.enableAutoInit
      ) {
        helper.logger('自动初始化配置未开启');
        // 将空间数据配置给置空，阻塞后续的初始化脚本执行
        instance.workspaceKeys = [];
        instance.addConfigStorage('workspaces', []);
        return false;
      }

      const needToBeInitializedWorkspaceKeys = workspaces.filter(workspace => {
        const testConfig = testConfigs.find(i => i.workspaceKey === workspace.key);
        if (!testConfig) return true;
        // 已经被初始化，但是 itemTypeMap 为空，需要重新初始化
        if (!testConfig.itemTypeMap || !Object.keys(testConfig.itemTypeMap ?? {}).length)
          return true;
      });

      // 如果没有需要初始化的空间，不需要执行初始化脚本
      if (!needToBeInitializedWorkspaceKeys.length) {
        helper.logger('没有需要初始化的空间');
        return false;
      }

      return {
        canExecute: true,
        data: needToBeInitializedWorkspaceKeys.map(item => item.key),
      };
    },
    function: async (instance, needToBeInitializedWorkspaceKeys) => {
      const builtInItemTypes = await dataFetcher.getBuiltInItemType();
      // 如果内置的事项类型未被移除，能够更新空间层级方案
      const disableUpdateItemTypeMap =
        instance.options.disableUpdateItemTypeMap ||
        builtInItemTypes.length !== Constants.BuiltInItemTypeKeys.length;

      // 初始化空间配置数据
      const [ItemTypeSchemeModel, TestConfigModel] = await Promise.all([
        getParseModel(false, Constants.ModelNames.ItemTypeScheme),
        getParseModel(false, Constants.ModelNames.TestConfig),
      ]);

      const workspaces = instance.getConfigStorage('workspaces');

      // 需要被初始化的空间
      const workspaceInfos = workspaces.filter(workspace =>
        needToBeInitializedWorkspaceKeys.includes(workspace.key),
      );

      helper.logger(
        '空间配置开始初始化',
        workspaceInfos.map(i => ({
          workspaceKey: i.key,
        })),
      );

      // 初始化空间空间层级方案
      let needUpdateItemTypeSchemeObjects = [];
      if (!disableUpdateItemTypeMap) {
        // 需要被增加隐藏是想类型的类型方案
        const needBeAddonItemTypeScheme = workspaceInfos
          .map(workspaceInfo => {
            const { itemTypeScheme } = workspaceInfo;
            try {
              const excludeItemTypeKeySet = new Set(Constants.BuiltInItemTypeKeys);
              // 界面层级方案顶级事项中是否包含内置的三个事项类型
              const hierarchy = JSON.parse(itemTypeScheme?.hierarchy ?? '[]');

              helper.logger('_____________hierarchy___________', itemTypeScheme, hierarchy);

              hierarchy.forEach(itemType => {
                if (excludeItemTypeKeySet.has(itemType.key)) {
                  excludeItemTypeKeySet.delete(itemType.key);
                }
              });

              if (excludeItemTypeKeySet.size) {
                const hierarchyAppendItemTypes = builtInItemTypes
                  .filter(item => excludeItemTypeKeySet.has(item.key))
                  .map(item => ({
                    key: item.key,
                    objectId: item.objectId,
                  }));
                const newHierarchyData = hierarchy.concat(hierarchyAppendItemTypes);

                return {
                  ...itemTypeScheme,
                  newHierarchyData,
                };
              }
            } catch (err) {
              console.error('execute error', err);
            }
          })
          .filter(i => i && i.newHierarchyData);

        // 更新事项类型方案配置
        needUpdateItemTypeSchemeObjects = needBeAddonItemTypeScheme.map(scheme => {
          const itemTypeSchemaObject = new ItemTypeSchemeModel();
          const objectId = scheme.objectId;
          itemTypeSchemaObject.set({
            objectId,
            id: objectId,
            hierarchy: JSON.stringify(scheme.newHierarchyData),
          });
          (itemTypeSchemaObject as any).id = objectId;
          return itemTypeSchemaObject;
        });
      }

      const needUpdateTestConfigObjects = workspaceInfos.map(workspaceInfo => {
        const DefaultItemTypeMap = {
          TestPlan: 'test_manager_plan',
          TestCase: 'test_manager_detail',
          TestExecution: 'test_manager_execution',
        };

        const initialConfigData = {
          global: false,
          isolateTestType: ['TestPlan', 'TestDefect', 'TestDetail', 'TestExecution'],
          itemTypeMap: disableUpdateItemTypeMap ? undefined : DefaultItemTypeMap,
          workspaceKey: workspaceInfo.key,
          defectsMapping: [],
          tableFields: {
            TestCase: {
              serachFields: ['key'],
            },
          },
        };

        const existedTestConfigObjectId = workspaceInfo.testConfig?.objectId;

        // 如果已经存在空间配置，但是数据不正确，需要更新
        if (existedTestConfigObjectId) {
          (initialConfigData as any).objectId = existedTestConfigObjectId;
        }

        return new TestConfigModel(initialConfigData);
      });

      // 保存所有的对象
      await saveAllObject([].concat(needUpdateTestConfigObjects, needUpdateItemTypeSchemeObjects));

      // 因为可能存在新初始化的数据，重新获取一次配置数据，避免影响下一阶段的执行
      instance.addConfigStorage(
        'testConfigs',
        await dataFetcher.getTestConfigs(instance.workspaceKeys),
      );
    },
  },
  // 初始化图表配置
  initChartOption: {
    key: 'initChartOption',
    canExecute: async instance => {
      const { getConfigStorage } = instance;
      const testConfigs = getConfigStorage('testConfigs');
      const needToBeInitializedWorkspaceKeys = testConfigs
        .filter(i => !i.chartGroups)
        .map(i => i.workspaceKey);

      if (!needToBeInitializedWorkspaceKeys.length) {
        helper.logger('没有需要初始化测试概览配置的空间');
        return false;
      }

      return {
        canExecute: true,
        data: needToBeInitializedWorkspaceKeys,
      };
    },
    function: async (instance, needToBeInitializedWorkspaceKeys) => {
      const { getConfigStorage } = instance;
      const workspaces = getConfigStorage('workspaces');
      const testConfigs = getConfigStorage('testConfigs');
      const TestConfigModel = await getParseModel(false, Constants.ModelNames.TestConfig);

      const needToBeInitializedChartGroups = needToBeInitializedWorkspaceKeys.map(key => ({
        workspace: workspaces.find(i => i.key === key),
        defectsMapping: testConfigs.find(i => i.workspaceKey === key)?.defectsMapping ?? [],
      }));

      const chartGroupMapValues = await batchCreateChartGroups(needToBeInitializedChartGroups);
      // 更新 testConfig chartGroups 标识
      const needUpdateTestConfigObjects = chartGroupMapValues.map(
        ({ workspaceKey, chartGroups }) => {
          const testConfigData = testConfigs.find(i => i.workspaceKey === workspaceKey);
          const testConfigObject = new TestConfigModel();

          const objectId = testConfigData.objectId;

          (testConfigObject as any).id = objectId;
          testConfigObject.set({
            objectId,
            id: objectId,
            chartGroups,
          });

          return testConfigObject;
        },
      );
      await saveAllObject(needUpdateTestConfigObjects);

      helper.logger('------------>>>>>>>>>>测试概览配置初始化完成<<<<<<<<<<------------');
    },
  },
} as const;

export default Initialization;
