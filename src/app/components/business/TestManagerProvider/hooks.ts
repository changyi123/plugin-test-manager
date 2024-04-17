import { TestType } from 'common/constant';
import React from 'react';

import { commonQuery } from '@/services/query';

const useGetPermissions = (workspace: Record<string, any>, testConfig: Record<string, any>) => {
  const { data: itemScreenType } = commonQuery.useItemCreateScreenType(workspace?.objectId);
  // 获取不可用的创建权限
  const getCreatePermission = React.useCallback(
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
    [itemScreenType, testConfig?.defectsMapping, testConfig?.itemTypeMap],
  );

  return {
    getCreatePermission,
  };
};

export { useGetPermissions };
