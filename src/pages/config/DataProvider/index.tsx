import React from 'react';
import { DataContext } from '../context';
import { useSessionStorageState } from 'ahooks';
import WorkspaceSelectorModal from '../WorkspaceSelectorModal';

const DataProvider = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useSessionStorageState(
    'TEST_MANAGER_CURRENT_WORKSPACE',
    {
      defaultValue: null,
    },
  );
  const workspaceSelectorRef = React.useRef<any>();

  const value = React.useMemo(() => {
    return {
      workspace: currentWorkspace,
      /** 切换 workspace */
      toggleWorkspace: async () => {
        const workspace = await workspaceSelectorRef.current.open(currentWorkspace);
        setCurrentWorkspace(workspace);
      },
    };
  }, [currentWorkspace, setCurrentWorkspace]);

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
