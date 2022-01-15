import React from 'react';
import { DataContext } from './context';
import { useRequest, useSafeState } from 'ahooks';
import { getTestConfig, createEmptyTestConfig } from '@/lib/api/common';

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
