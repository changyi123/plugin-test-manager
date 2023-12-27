import { useSDK } from '@projectproxima/plugin-sdk';
import { LibraryProvider as AppsLibraryProvider } from 'apps-team-components-v1';
import React, { useMemo } from 'react';
import { RecoilRoot } from 'recoil';

import { getDevConfig } from '@/devEnv';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getRootContainer } from '@/lib/utils/helper';
import { getLang } from '@/lib/utils/locale';

import {
  checkTransitionScript,
  fetchItemById,
  fetchRole,
  getItemStatus,
  getWorkflowData,
  runTransition,
  useUserGroupAndRole,
} from './util';

const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { workspace } = useTestConfig();
  const { context } = useSDK();

  const proximaGatewayURL = context?.env?.PROXIMA_GATEWAY ?? getDevConfig()?.baseURL;

  const tenant = useMemo(
    () => context?.env.PROXIMA_APP_ID ?? 'proxima-core',
    [context?.env.PROXIMA_APP_ID],
  );

  const { currentGroups, currentRoles, currentUser, loading } = useUserGroupAndRole(
    context?.currentUser?.id,
  );

  return (
    <RecoilRoot>
      <AppsLibraryProvider
        locale={getLang()}
        workspaceKey={workspace?.key}
        teamGateway={proximaGatewayURL}
        getPopupContainer={getRootContainer}
        teamBasePath={proximaGatewayURL}
        currentUser={
          {
            currentUser,
            loading,
            currentGroups,
            currentRoles,
          } as any
        }
        tenant={tenant}
        item={{
          fetchItemById,
        }}
        workflow={{
          checkTransitionScript: (scriptText: string, params: any) =>
            checkTransitionScript(scriptText, params, tenant),
          fetchRole,
          getWorkflowData,
          runTransition,
          getItemStatus,
        }}
      >
        {children}
      </AppsLibraryProvider>
    </RecoilRoot>
  );
};

export default LibraryProvider;
