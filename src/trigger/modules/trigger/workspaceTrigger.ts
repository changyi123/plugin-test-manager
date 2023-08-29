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
