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
    ChartTemplate: 'team_insight_charts_base_ChartGroupTemplate',
  } as const,

  // 内置的事项类型关联映射
  DefaultBuiltInItemTypeMap: {
    TestPlan: 'test_manager_plan',
    TestCase: 'test_manager_detail',
    TestExecution: 'test_manager_execution',
  } as const,

  DefaultIsolateTestType: ['TestPlan', 'TestDefect', 'TestDetail', 'TestExecution'],
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
    // sessionToken: global.sessionToken,
    useMasterKey: true,
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
      .include(['itemTypeScheme'])
      .findAll(ParseBaseQueryOptions)
      .then(data => data.map(i => i.toJSON()));

    let chartTemplateMaps = {};
    try {
      const chartTemplateQuery = await getParseQuery(false, Constants.ModelNames.ChartTemplate);
      chartTemplateMaps = await chartTemplateQuery
        .containedIn(
          'templateId',
          workspaces.map(workspace => workspace.workspaceTemplate?.objectId).filter(Boolean),
        )
        .findAll(ParseBaseQueryOptions)
        .then(data => data.reduce((prev, cur) => ({ ...prev, [cur.get('templateId')]: true }), {}));
    } catch (error) {
      console.error('getChartTemplates error', error);
    }

    console.info('chartTemplateMaps______________', chartTemplateMaps, workspaces);
    return workspaces.map(workspace => {
      workspace.hasChartTemplate = !!chartTemplateMaps[workspace.workspaceTemplate?.objectId];
      return workspace;
    });
  },
  getTestConfigs: async workspaceKeys => {
    const ParseBaseQueryOptions = helper.getParseBaseQueryOptions();
    const testConfigQuery = await getParseQuery(false, Constants.ModelNames.TestConfig);
    return testConfigQuery
      .containedIn('workspaceKey', workspaceKeys)
      .findAll(ParseBaseQueryOptions)
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
  // 获取 itemType
  getItemTypeByKeys: async (keys: string[]) => {
    const ParseBaseQueryOptions = helper.getParseBaseQueryOptions();

    const itemTypeQuery = await getParseQuery(false, Constants.ModelNames.ItemType);

    return itemTypeQuery
      .containedIn('key', keys)
      .select(['key', 'name', 'objectId', 'icon'])
      .find({
        ...ParseBaseQueryOptions,
        context: {
          displayModule: 'plugin.testManager',
        },
      })
      .then(data => data.map(i => i.toJSON()));
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
      const globalTestConfig = instance.getConfigStorage('globalTestConfig');

      const needToBeInitializedWorkspaceKeys = workspaces
        .map(workspace => {
          const testConfig = testConfigs.find(i => i.workspaceKey === workspace.key);
          // 已经被初始化，但是 itemTypeMap 为空，需要重新初始化
          if (!testConfig?.itemTypeMap || !Object.keys(testConfig?.itemTypeMap ?? {}).length)
            return {
              workspaceKey: workspace?.key,
              itemTypeMap: testConfig?.itemTypeMap,
            };
        })
        .filter(Boolean);

      console.info(
        '\n',
        '_____needToBeInitializedWorkspaceKeys_____',
        JSON.stringify(needToBeInitializedWorkspaceKeys),
        '\n',
      );

      // 如果没有需要初始化的空间且未开启事项类型隔离映射，不需要执行初始化脚本
      if (!needToBeInitializedWorkspaceKeys.length && !globalTestConfig?.extra?.isolatedSystem) {
        helper.logger('没有需要初始化的空间');
        return false;
      }

      return {
        canExecute: true,
        data: needToBeInitializedWorkspaceKeys.map(item => item.workspaceKey),
      };
    },
    function: async (instance, needToBeInitializedWorkspaceKeys) => {
      const globalTestConfig = instance.getConfigStorage('globalTestConfig');
      const testConfigs = instance.getConfigStorage('testConfigs');

      let initialItemTypeMapping = globalTestConfig?.extra?.initialItemTypeMapping;

      if (
        // 不存在初始化的配置
        !initialItemTypeMapping ||
        !Object.keys(initialItemTypeMapping).length ||
        // 开启事项隔离
        globalTestConfig?.extra?.isolatedSystem
      ) {
        const builtInItemTypes = await dataFetcher.getBuiltInItemType();
        if (builtInItemTypes.length === 3) {
          initialItemTypeMapping = Constants.DefaultBuiltInItemTypeMap;
        }
      }

      // 如果内置的事项类型未被移除，能够更新空间层级方案
      const enableUpdateItemTypeMap =
        (!!globalTestConfig?.extra?.isolatedSystem ||
          !!globalTestConfig.extra?.enableItemTypeAutoBind) &&
        !!Object.values(initialItemTypeMapping).length;

      console.info(
        '_____enableUpdateItemTypeMap_____',
        enableUpdateItemTypeMap,
        initialItemTypeMapping,
      );

      // 初始化空间配置数据
      const [ItemTypeSchemeModel, TestConfigModel] = await Promise.all([
        getParseModel(false, Constants.ModelNames.ItemTypeScheme),
        getParseModel(false, Constants.ModelNames.TestConfig),
      ]);

      const workspaces = instance.getConfigStorage('workspaces');

      // 需要被初始化的空间
      const workspaceInfos = needToBeInitializedWorkspaceKeys
        .map(workspaceKey => workspaces.find(workspace => workspace.key === workspaceKey))
        .map(workspace => {
          const testConfig = testConfigs.find(config => config.workspaceKey === workspace.key);
          return {
            ...workspace,
            testConfig,
          };
        });

      helper.logger(
        '空间配置开始初始化',
        workspaceInfos.map(i => ({
          workspaceKey: i.key,
          testConfig: i.testConfig?.objectId,
        })),
      );

      // 初始化空间空间层级方案
      let needUpdateItemTypeSchemeObjects = [];
      if (enableUpdateItemTypeMap) {
        const initialItemTypeKeys = Object.values(initialItemTypeMapping) as string[];
        const initialItemTypes = await dataFetcher.getItemTypeByKeys(initialItemTypeKeys);
        // 需要被增加隐藏是想类型的类型方案
        const needBeAddonItemTypeScheme = workspaceInfos
          .map(workspaceInfo => {
            const { itemTypeScheme } = workspaceInfo;
            try {
              const excludeItemTypeKeySet = new Set(initialItemTypeKeys);
              // 界面层级方案顶级事项中是否包含内置的三个事项类型
              const hierarchy = JSON.parse(itemTypeScheme?.hierarchy ?? '[]');

              hierarchy.forEach(itemType => {
                if (excludeItemTypeKeySet.has(itemType.key)) {
                  excludeItemTypeKeySet.delete(itemType.key);
                }
              });

              if (excludeItemTypeKeySet.size) {
                const hierarchyAppendItemTypes = initialItemTypes
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

      const needUpdateTestConfigObjects = workspaceInfos
        .map(workspaceInfo => {
          const initialConfigData = {
            global: false,
            isolateTestType: Constants.DefaultIsolateTestType,
            itemTypeMap: enableUpdateItemTypeMap ? initialItemTypeMapping : undefined,
            workspaceKey: workspaceInfo.key,
            defectsMapping: [],
            tableFields: {
              TestCase: {
                serachFields: ['key'],
              },
            },
          };

          const existedTestConfigObjectId = workspaceInfo.testConfig?.objectId;

          const testConfigParseObject = new TestConfigModel();

          // 如果已经存在空间配置，但是数据不正确，需要更新
          if (existedTestConfigObjectId) {
            if (enableUpdateItemTypeMap) {
              // 覆盖式更新
              testConfigParseObject.set({
                itemTypeMap: initialConfigData.itemTypeMap,
                id: existedTestConfigObjectId,
                objectId: existedTestConfigObjectId,
              });
              (testConfigParseObject as any).id = testConfigParseObject;
            }
          } else {
            testConfigParseObject.set(initialConfigData);
          }

          return testConfigParseObject;
        })
        .filter(Boolean);

      // 保存所有的对象
      await saveAllObject(
        [].concat(
          needUpdateTestConfigObjects.filter(
            config => config.get('id') || config.get('objectId') || config.get('workspaceKey'),
          ),
          needUpdateItemTypeSchemeObjects,
        ),
      );

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
      const workspaces = getConfigStorage('workspaces').filter(it => !it.hasChartTemplate);
      console.info('initChartOptionWorkspaces______________', workspaces);
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

export { dataFetcher };
