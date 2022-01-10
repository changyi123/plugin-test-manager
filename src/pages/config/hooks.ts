import React from 'react';
import { getTestConfig } from '@/lib/api/common';
import { useSessionStorageState, useRequest } from 'ahooks';

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
        if (prev) window.location.reload();
        return workspace;
      });
    },
    [setCurrentWorkspace],
  );
  return [currentWorkspace, toggleWorkspace];
};

export const useCurrentTestConfig = workspaceKey => {
  const { data } = useRequest(
    () =>
      getTestConfig({
        workspaceKey,
      }),
    {
      ready: workspaceKey,
      refreshDeps: [workspaceKey],
    },
  );

  return data;
};
