import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query/src/types';

import { getAllItemTypes, getPluginBoundWorkspaces } from '@/lib/api/proxima';
import Parse from '@/lib/parse';
import type { Workspace as WorkspaceType } from '@/lib/types/App';
import fetch from '@/lib/utils/fetch';

type WorkspaceQueryParams = { key?: string; id?: string };

export const CommonQueryKeys = {
  workspace: (workspaceQueryParams: WorkspaceQueryParams) => ['workspace', workspaceQueryParams],
  itemCreateScreenType: (workspaceId: string) => ['workspaceScreenType', workspaceId],
  testEntityById: (testEntityId: string) => ['testEntity', testEntityId],
  installedWorkspaces: () => ['installedWorkspaces'],
  allItemTypes: () => ['allItemTypes'],
};

export const useWorkspaceQuery = (params: WorkspaceQueryParams) => {
  return useQuery(
    CommonQueryKeys.workspace(params ?? {}),
    async () => {
      if (!params.id && !params.key) return;
      const query = new Parse.Query('Workspace');
      if (params.id) {
        query.equalTo('objectId', params.id);
      } else if (params.key) {
        query.equalTo('key', params.key);
      }
      return query.first({ json: true });
    },
    {
      cacheTime: Infinity,
      staleTime: Infinity,
      enabled: Object.keys(params ?? {}).length > 0,
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
      cacheTime: Infinity,
      staleTime: Infinity,
      enabled: !!workspaceId,
      ...options,
    },
  );
};

/** 获取空间安装 */
export const useInstalledWorkspaces = () => {
  return useQuery(
    CommonQueryKeys.installedWorkspaces(),
    async () => {
      return (await getPluginBoundWorkspaces()) as WorkspaceType[];
    },
    {
      cacheTime: Infinity,
      staleTime: Infinity,
    },
  );
};

/** 获取所有的事项类型 */
export const useAllItemTypes = (showHiddenItemType = true) => {
  return useQuery(CommonQueryKeys.allItemTypes(), () => getAllItemTypes(showHiddenItemType), {
    cacheTime: Infinity,
    staleTime: Infinity,
  });
};
