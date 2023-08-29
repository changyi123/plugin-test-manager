import { useLocalStorageState, useRequest } from 'ahooks';
import React, { useState } from 'react';

import { getTestConfig } from '@/lib/api/common';
import { getWorkspaceByKey } from '@/lib/api/proxima';
import { useCurrentUser } from '@/lib/api/user';
import Parse from '@/lib/parse';
import { generateStorageKey } from '@/lib/utils/helper';
import { TestConfig } from '@/services/models';
import { commonQuery } from '@/services/query';

import { DataContext } from '../context';
import { generateDefaultTestConfig } from '../helper';
import WorkspaceSelectorModal from '../WorkspaceSelectorModal';

const CurrentWorkspaceStorageKey = generateStorageKey('current-workspace');
/**
 * 空间配置初始化
 * 1. 为所有空间创建空间级别的配置
 * 2. 开启事项隔离后，为所有类型层级方案增加内置类型
 */
const useConfigBootstrap = globalConfig => {
  const { data: workspaces } = commonQuery.useInstalledWorkspaces();
  const allWorkspaceKeys = workspaces?.map(item => item.key);
  useCurrentUser();

  const { data: testConfigs } = useRequest(
    async () =>
      new Parse.Query(TestConfig)
        .containedIn('workspaceKey', allWorkspaceKeys)
        .limit(allWorkspaceKeys.length)
        .find({
          json: true,
        }),
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
      const needCreatedTestConfigs = await Promise.all(
        workspaces
          .filter(workspace => testConfigs.every(config => config.workspaceKey !== workspace.key))
          .map(async workspace => {
            const testConfigInfo = await generateDefaultTestConfig(workspace, isolatedSystem);
            return new TestConfig(testConfigInfo);
          }),
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

  React.useEffect(() => {
    testConfigsReady &&
      // eslint-disable-next-line no-console
      console.log('%c test configs ready', 'font-size: 20px');
  }, [testConfigsReady]);
};

const DataProvider = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useLocalStorageState(CurrentWorkspaceStorageKey, {
    defaultValue: null,
  });
  // const [workspace, setWorkspace] = useState<any>(null);
  const workspaceSelectorRef = React.useRef<any>();

  const { data: globalConfig, refreshAsync: refreshGlobalConfig } = useRequest(async () => {
    const globalConfig = await getTestConfig({ global: true });
    return globalConfig.toJSON();
  });
  const [checkAllWorkspace, setCheckAllWorkspace] = useState(false);
  const [showAllWorkspaceCheck, setShowAllWorkspaceCheck] = useState(false);

  useConfigBootstrap(globalConfig);

  // 校验空间是否存在
  React.useEffect(() => {
    if (currentWorkspace) {
      const workspaceKey = currentWorkspace.key;
      const execute = async () => {
        const _workspace = await getWorkspaceByKey(workspaceKey);
        if (!_workspace) {
          setCurrentWorkspace(null);
        }
      };
      execute();
    }
  }, [currentWorkspace, setCurrentWorkspace]);

  const value = React.useMemo(() => {
    return {
      checkAllWorkspace,
      setCheckAllWorkspace,
      showAllWorkspaceCheck,
      setShowAllWorkspaceCheck,
      globalConfig,
      refreshGlobalConfig,
      workspace: currentWorkspace,
      /** 切换 workspace */
      toggleWorkspace: async () => {
        const workspace = await workspaceSelectorRef.current.open(currentWorkspace);
        setCurrentWorkspace(workspace);
      },
    };
  }, [
    checkAllWorkspace,
    currentWorkspace,
    globalConfig,
    refreshGlobalConfig,
    setCurrentWorkspace,
    showAllWorkspaceCheck,
  ]);

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
