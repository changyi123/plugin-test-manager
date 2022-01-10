import React from 'react';
import { useSessionStorageState, useRequest, useSafeState } from 'ahooks';
import { getTestConfig, createEmptyTestConfig } from '@/lib/api/common';

export const useSelectedWorkspace = () => {
  const [currentWorkspace, setCurrentWorkspace] = useSessionStorageState(
    'TEST_MANAGER_CURRENT_WORKSPACE',
    {
      defaultValue: {} as any,
    },
  );
  const toggleWorkspace = React.useCallback(
    workspace => {
      setCurrentWorkspace(prev => {
        // 已经配置过空间的，再次修改需要刷新系统
        if (prev?.key) window.location.reload();
        return workspace;
      });
    },
    [setCurrentWorkspace],
  );
  return [currentWorkspace, toggleWorkspace];
};

export const useCurrentTestConfig = workspaceKey => {
  const [testConfig, setTestConfig] = useSafeState(null);
  useRequest(
    () =>
      getTestConfig({
        workspaceKey,
      }),
    {
      ready: workspaceKey,
      refreshDeps: [workspaceKey],
      async onSuccess(testConfig) {
        // 不存在则新建
        if (!testConfig) {
          testConfig = await createEmptyTestConfig(workspaceKey);
        }
        setTestConfig(testConfig);
      },
    },
  );
  return testConfig;
};
