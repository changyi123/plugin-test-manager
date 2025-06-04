import { useSDK } from '@projectproxima/plugin-sdk';
import { LibraryProvider as AppsLibraryProvider } from 'apps-team-components-v1';
import { hooks } from 'proxima-sdk';
import React, { useMemo } from 'react';
import { RecoilRoot } from 'recoil';

import { getDevConfig } from '@/devEnv';
import { getRootContainer } from '@/lib/utils/helper';
import { getLang } from '@/lib/utils/locale';

const { TokenProvider } = hooks;

import {
  checkTransitionScript,
  fetchItemById,
  fetchRole,
  getItemStatus,
  getWorkflowData,
  runTransition,
} from './util';

const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { context } = useSDK();

  // todo 有个历史问题，但是影响有点大，只影响非集成环境，这个地方需要先备注下
  const proximaGatewayURL = context?.env?.PROXIMA_GATEWAY ?? getDevConfig()?.baseURL;
  const proximaTeamBaseUrl = context?.env?.PROXIMA_BASE_PATH ?? getDevConfig()?.baseURL;

  const tenant = useMemo(
    () => context?.env.PROXIMA_APP_ID ?? 'proxima-core',
    [context?.env.PROXIMA_APP_ID],
  );

  const currentUser = useMemo(
    () => Parse.Object.fromJSON({ ...context.currentUser, className: '_User' }),
    [context.currentUser],
  );

  return (
    <RecoilRoot>
      <TokenProvider tenant={tenant} token={context?.env?.sessionToken}>
        <AppsLibraryProvider
          locale={getLang()}
          workspaceKey={context?.env?.WORKSPACE_KEY}
          teamGateway={proximaGatewayURL}
          getPopupContainer={getRootContainer}
          teamBasePath={proximaTeamBaseUrl}
          datetimeFormat="absolute"
          currentUser={
            {
              currentUser,
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
      </TokenProvider>
    </RecoilRoot>
  );
};

export default LibraryProvider;
