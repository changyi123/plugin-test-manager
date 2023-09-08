import { useMemoizedFn } from 'ahooks';
import { TestType } from 'common/constant';

import { commonQuery, testConfigQuery } from '@/services/query';

const useGetPermissions = (workspace: Record<string, any>) => {
  const { data: testConfig } = testConfigQuery.useWorkspaceTestConfig(workspace?.key, {
    staleTime: 1000 * 60 * 60,
  });
  const { data: itemScreenType } = commonQuery.useItemCreateScreenType(workspace?.objectId);

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
