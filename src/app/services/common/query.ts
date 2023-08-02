import { useQuery } from '@tanstack/react-query';

import type { Workspace as WorkspaceType } from '@/lib/types/App';

import { Workspace } from '../models';

export const CommonQueryKeys = {
  workspace: (params: { key: string }) => ['workspace', params],
} as const;

export type CommonQueryKeysType = typeof CommonQueryKeys;

export const useWorkspace = (params: Parameters<CommonQueryKeysType['workspace']>[0]) => {
  return useQuery(
    CommonQueryKeys.workspace(params),
    async () => {
      const workspaceQuery = new Parse.Query(Workspace);
      if (params.key) {
        workspaceQuery.equalTo('key', params.key);
      }

      return (await workspaceQuery.first({ json: true })) as unknown as WorkspaceType;
    },
    {
      staleTime: Infinity,
    },
  );
};
