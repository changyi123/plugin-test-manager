import React from 'react';
import Parse from '@/lib/parse';
import { DataContext } from '../context';
import { TestConfig } from '@/lib/models';
import { getTestConfig } from '@/lib/api/common';
import { generateDefaultTestConfig } from '../helper';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import { useSessionStorageState, useRequest } from 'ahooks';
import { updateUsedHierarchySchema } from '@/lib/api/proxima';
import WorkspaceSelectorModal from '../WorkspaceSelectorModal';

/**
 * 空间配置初始化
 * 1. 为所有空间创建空间级别的配置
 * 2. 开启事项隔离后，为所有事项类型层级方案增加内置事项类型
 */
const useConfigBootstrap = globalConfig => {
  const allWorkspaces = useAllTestWorkspace();
  const allWorkspaceKeys = allWorkspaces?.map(item => item.key);
  const { data: testConfigs } = useRequest(
    async () =>
      new Parse.Query(TestConfig)
        .containedIn('workspaceKey', allWorkspaceKeys)
        .map(item => item.toJSON()),
    {
      cacheKey: 'ALL_TEST_CONFIGS',
      ready: Array.isArray(allWorkspaceKeys),
    },
  );

  // 判断测试管理配置是否就绪
  const { data: testConfigsReady } = useRequest(
    async () => {
      const isolatedSystem = Boolean(globalConfig?.extra?.isolatedSystem);
      // 需要创建的测试执行配置
      const needCreatedTestConfigs = allWorkspaceKeys
        .filter(key => testConfigs.every(config => config.workspaceKey !== key))
        .map(
          workspaceKey => new TestConfig(generateDefaultTestConfig(workspaceKey, isolatedSystem)),
        );

      if (needCreatedTestConfigs.length) {
        await Parse.Object.saveAll(needCreatedTestConfigs);
      }
      return true;
    },
    {
      ready: Boolean(globalConfig && testConfigs),
    },
  );

  const { data: hierarchySchemeReady } = useRequest(
    async () => {
      const isolatedSystem = Boolean(globalConfig?.extra?.isolatedSystem);
      if (isolatedSystem) {
        await updateUsedHierarchySchema();
      }
      return true;
    },
    {
      ready: Boolean(globalConfig),
    },
  );

  React.useEffect(() => {
    hierarchySchemeReady &&
      testConfigsReady &&
      // eslint-disable-next-line no-console
      console.log('%c test configs ready', 'font-size: 20px');
  }, [hierarchySchemeReady, testConfigsReady]);
};

const DataProvider = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useSessionStorageState(
    'TEST_MANAGER_CURRENT_WORKSPACE',
    {
      defaultValue: null,
    },
  );
  const workspaceSelectorRef = React.useRef<any>();

  const { data: globalConfig, refreshAsync: refreshGlobalConfig } = useRequest(async () => {
    const globalConfig = await getTestConfig({ global: true });
    return globalConfig.toJSON();
  });

  useConfigBootstrap(globalConfig);

  const value = React.useMemo(() => {
    return {
      globalConfig,
      refreshGlobalConfig,
      workspace: currentWorkspace,
      /** 切换 workspace */
      toggleWorkspace: async () => {
        const workspace = await workspaceSelectorRef.current.open(currentWorkspace);
        setCurrentWorkspace(workspace);
      },
    };
  }, [currentWorkspace, globalConfig, refreshGlobalConfig, setCurrentWorkspace]);

  return (
    <DataContext.Provider value={value}>
      <>
        {children}
        <WorkspaceSelectorModal actionRef={workspaceSelectorRef} />
      </>
    </DataContext.Provider>
  );
};

export default DataProvider;
