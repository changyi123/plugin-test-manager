import React from 'react';
import { useRequest } from 'ahooks';
import { pick } from 'lodash';
import { ETestType } from '@/lib/types/Test';
import { getTestConfig } from '@/lib/api/common';
import { ConfigContext, ConfigContextType } from './context';

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

  const { data: testConfig } = useRequest(() => getTestConfig(workspaceId), {
    staleTime: 50000,
    ready: !!workspaceId,
    cacheKey: workspaceId,
    refreshDeps: [workspaceId],
  });

  const contextValues = React.useMemo<ConfigContextType>(() => {
    const config = pick(testConfig?.toJSON() ?? {}, ['itemTypeMap']);
    return {
      // TODO: fetch config
      config: {
        itemTypeMap: config.itemTypeMap ?? {},
      },
      workspaceId,
      setWorkspaceId,
    };
  }, [workspaceId, testConfig]);

  return <ConfigContext.Provider value={contextValues}>{children}</ConfigContext.Provider>;
};

export default React.memo(ConfigProvider);
