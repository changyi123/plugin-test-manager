import React from 'react';
import { DataContext } from '../context';
import { getTestConfig } from '@/lib/api/common';
import { useSessionStorageState, useRequest } from 'ahooks';
import WorkspaceSelectorModal from '../WorkspaceSelectorModal';

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
