import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query/src/types';

import Parse from '@/lib/parse';
import fetch from '@/lib/utils/fetch';

type WorkspaceQueryParams = { key?: string; id?: string };

export const CommonQueryKeys = {
  workspace: (workspaceQueryParams: WorkspaceQueryParams) => ['workspace', workspaceQueryParams],
  itemCreateScreenType: (workspaceId: string) => ['workspaceScreenType', workspaceId],
  testEntityById: (testEntityId: string) => ['testEntity', testEntityId],
};

export const useWorkspaceQuery = (params: WorkspaceQueryParams) => {
  return useQuery(
    CommonQueryKeys.workspace(params ?? {}),
    async () => {
      const query = new Parse.Query('Workspace');
      if (params.id) {
        query.equalTo('objectId', params.id);
      } else if (params.key) {
        query.equalTo('key', params.key);
      }
      return query.first({ json: true });
    },
    {
      enabled: Object.keys(params ?? {}).length > 0,
      staleTime: 1000 * 60 * 60 * 24,
    },
  );
};

export const useItemCreateScreenType = (workspaceId: string, options?: UseQueryOptions<any>) => {
  return useQuery(
    CommonQueryKeys.itemCreateScreenType(workspaceId),
    async () => {
      if (!workspaceId) return;
      return fetch.$post('/parse/api/itemType/screenType', {
        workspaceId: workspaceId,
        context: {
          screenType: 'create',
        },
      });
    },
    {
      staleTime: 1000 * 60 * 60 * 24,
      enabled: !!workspaceId,
      ...options,
    },
  );
};
