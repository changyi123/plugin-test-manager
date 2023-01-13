import { useCallback } from 'react';
import fetch from '@/lib/utils/fetch';
import { getTestConfig } from '@/lib/api/common';
import { useRequest } from 'ahooks';

const useGetPermissions = (workspace: Record<string, any>) => {
  const { data: testConfig } = useRequest(
    async () => {
      if (!workspace?.key) return;
      const config = await getTestConfig({ workspaceKey: workspace?.key });
      return config?.toJSON();
    },
    {
      cacheKey: `test-config-${workspace?.key}`,
      refreshDeps: [workspace?.key],
      cacheTime: 999999,
      staleTime: 999999,
    },
  );

  const { data: itemScreenType } = useRequest(
    async () => {
      if (!workspace?.objectId) return;
      const data = await fetch.$post('/parse/api/itemType/screenType', {
        workspaceId: workspace.objectId,
        context: {
          screenType: 'create',
        },
      });

      return data;
    },
    {
      cacheKey: `item-screenType-${workspace?.objectId}`,
      refreshDeps: [workspace?.objectId],
      cacheTime: 999999,
      staleTime: 999999,
    },
  );

  const getCreatePermission = useCallback(
    key => {
      const itemScreenTypeKeys = itemScreenType?.map(d => d.key) ?? [];
      const testTypeMapping = Object.entries(testConfig?.itemTypeMap ?? {}).reduce(
        (prev, [testKey, typeKey]) => {
          prev[testKey] = !itemScreenTypeKeys.includes(typeKey);
          return prev;
        },
        {},
      );
      return testTypeMapping?.[key];
    },
    [itemScreenType, testConfig?.itemTypeMap],
  );

  return {
    getCreatePermission,
  };
};

export { useGetPermissions };
