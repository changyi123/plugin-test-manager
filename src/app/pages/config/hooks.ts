import React from 'react';
import { DataContext } from './context';
import { useRequest, useSafeState } from 'ahooks';
import { getTestConfig } from '@/lib/api/common';

export const useDataContext = () => React.useContext(DataContext);

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
        setTestConfig(testConfig);
      },
    },
  );
  return testConfig;
};
