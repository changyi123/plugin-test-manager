import React from 'react';
import { ConfigContext, ConfigContextType } from './context';
// import { useRequest } from 'ahooks';

type RepositoryDataProviderProps = Pick<ConfigContextType, 'workspaceId'> & {
  children: React.ReactNode;
};

const ConfigProvider: React.FC<RepositoryDataProviderProps> = ({
  children,
  workspaceId: workspaceIdProp,
}) => {
  const [workspaceId, setWorkspaceId] = React.useState<string>();

  React.useEffect(() => {
    setWorkspaceId(workspaceIdProp);
  }, [workspaceIdProp]);

  const contextValues = React.useMemo<ConfigContextType>(() => {
    return {
      // TODO: fetch config
      config: {},
      workspaceId,
      setWorkspaceId,
    };
  }, [workspaceId]);

  return <ConfigContext.Provider value={contextValues}>{children}</ConfigContext.Provider>;
};

export default React.memo(ConfigProvider);
