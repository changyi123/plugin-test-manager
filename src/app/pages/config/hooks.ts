import { useRequest, useSafeState } from 'ahooks';
import React from 'react';

import { getTestConfig } from '@/lib/api/common';

import { DataContext } from './context';

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
