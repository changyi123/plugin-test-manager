import { BuiltInInitializationStages, Initialization } from '../../lib/initialization';

// 空间创建
export const workspaceCreated = async () => {
  const { workspace } = global as any;
  const workspaceKey = workspace.key;
  // eslint-disable-next-line no-console
  console.log('\n\n\nworkspace create trigger executing... workspaceKey: ' + workspaceKey);

  const initialization = new Initialization(
    [BuiltInInitializationStages.initTestConfig, BuiltInInitializationStages.initChartOption],
    {
      workspaceKeys: [workspaceKey],
    },
  );

  await initialization.init();

  // eslint-disable-next-line no-console
  console.log('workspace create trigger execute success!!!');
};

// 空间绑定
export const workspaceBind = async params => {
  const appsWorkspace = params.payload?.appsWorkspace;
  // 非测试管理空间绑定不处理
  if (appsWorkspace?.appKey !== 'test_manager') {
    return;
  }

  const workspaceKeys = appsWorkspace?.insert || [];

  // eslint-disable-next-line no-console
  console.log('------workspaceBind--------', JSON.stringify(params.payload?.appsWorkspace?.insert));
  if (!workspaceKeys?.length) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(
    '\n\n\nworkspace bind trigger executing... workspaceKeys: ' + JSON.stringify(workspaceKeys),
  );

  const initialization = new Initialization(
    [BuiltInInitializationStages.initTestConfig, BuiltInInitializationStages.initChartOption],
    {
      workspaceKeys: workspaceKeys,
    },
  );

  await initialization.init();

  // eslint-disable-next-line no-console
  console.log('workspace create trigger execute success!!!');
};
