import { useCallback } from 'react';
import { useRequest } from 'ahooks';
import fetch from '@/lib/utils/fetch';
import { TestType } from 'common/constant';
import { getTestConfig } from '@/lib/api/common';

const useGetPermissions = (workspace: Record<string, any>) => {
  const { data: testConfig } = useRequest(
    async () => {
      if (!workspace?.key) return;
      const config = await getTestConfig({ workspaceKey: workspace?.key });
      return config?.toJSON();
    },
    {
      cacheKey: `test-config-${workspace?.key}`,
      ready: !!workspace?.key,
      refreshDeps: [workspace?.key],
      staleTime: -1,
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
      ready: !!workspace?.objectId,
      staleTime: -1,
    },
  );

  // 获取不可用的创建权限
  const getCreatePermission = useCallback(
    (key: TestType) => {
      const itemScreenTypeKeys = itemScreenType?.map(d => d.key) ?? [];
      const testTypeMapping = Object.entries(
        testConfig?.itemTypeMap ?? {
          [TestType.Case]: null,
          [TestType.Plan]: null,
          [TestType.Execution]: null,
        },
      )
        .concat([[TestType.TestDefect, testConfig?.defectsMapping?.[0]]])
        .reduce((prev, [testKey, typeKey]) => {
          prev[testKey] = !itemScreenTypeKeys.includes(typeKey);
          return prev;
        }, {});

      return testTypeMapping?.[key];
    },
    [itemScreenType, testConfig?.itemTypeMap, testConfig?.defectsMapping],
  );

  return {
    getCreatePermission,
  };
};

export { useGetPermissions };
