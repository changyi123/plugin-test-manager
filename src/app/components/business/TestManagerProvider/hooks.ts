import { useQuery } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import { TestType } from 'common/constant';

import fetch from '@/lib/utils/fetch';
import { testConfigQuery } from '@/services/query';

const useGetPermissions = (workspace: Record<string, any>) => {
  const { data: testConfig } = testConfigQuery.useWorkspaceTestConfig({
    workspaceKey: workspace?.key,
  });

  const { data: itemScreenType } = useQuery(
    ['item-screenType', workspace?.objectId],
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
      enabled: Boolean(workspace?.objectId),
      staleTime: Infinity,
    },
  );

  // 获取不可用的创建权限
  const getCreatePermission = useMemoizedFn((key: TestType) => {
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
  });

  return {
    getCreatePermission,
  };
};

export { useGetPermissions };
