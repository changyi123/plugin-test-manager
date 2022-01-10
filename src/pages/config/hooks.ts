import React from 'react';
import { useHistory } from 'react-router';
import { getTestConfig } from '@/lib/api/common';
import { useSessionStorageState, useRequest, useSafeState } from 'ahooks';

export const useSelectedWorkspace = () => {
  const history = useHistory();
  const [currentWorkspace, setCurrentWorkspace] = useSessionStorageState(
    'TEST_MANAGER_CURRENT_WORKSPACE',
    {
      defaultValue: {} as any,
    },
  );
  const toggleWorkspace = React.useCallback(
    workspace => {
      setCurrentWorkspace(workspace);
      history.go(0);
    },
    [history, setCurrentWorkspace],
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
