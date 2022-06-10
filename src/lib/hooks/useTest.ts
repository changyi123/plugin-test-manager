import { pick } from 'lodash';
import { useRequest } from 'ahooks';
import { TestType } from '@/lib/constants';
import { getAllTestWorkspaces } from '@/lib/api/proxima';
import { getRepositoryData } from '../api/repository';
import {
  getTestConfig,
  getAllTestConfigs,
  getTestEntitiesByRelationWithOrder,
} from '@/lib/api/common';
import React from 'react';
import { getRepoData, handleRroupPath } from '@/components/business/RepositoryGroup/repository';

type GetTestEntityParams = Parameters<typeof getTestEntitiesByRelationWithOrder>;
/** 获取所有事项实体 id */
export const useAllRelTestEntities = (
  relType: GetTestEntityParams['0'],
  sides: GetTestEntityParams['1'],
  include?: string[],
) => {
  if (Array.isArray(include)) {
    include = ['objectId'].concat(include);
  } else {
    include = ['objectId'];
  }
  const sideValues = Object.values(sides).filter(Boolean);
  const { data, mutate, refresh } = useRequest(
    async () => {
      const { list } = await getTestEntitiesByRelationWithOrder(relType, sides, {
        include,
        queryParams: { limit: 9999 },
      });
      return list?.map(item => (include?.length === 1 ? item.objectId : pick(item, include)));
    },
    {
      ready: Boolean(sideValues.length),
    },
  );

  return {
    mutate,
    refresh,
    testEntities: data ?? [],
  };
};

/* 判断是否空间隔离 */
export const useIsolateTestType = (workspaceKey: string, testType: TestType) => {
  const { data: testConfig } = useRequest(
    async () => {
      const testConfig = await getTestConfig({ workspaceKey });
      return testConfig.toJSON();
    },
    {
      ready: Boolean(workspaceKey),
      cacheTime: 99999999999,
      staleTime: 99999999999,
      refreshDeps: [workspaceKey],
    },
  );

  if (!Array.isArray(testConfig?.isolateTestType)) return true;
  return testConfig.isolateTestType.includes(testType);
};

/** 获取所有的测试空间 */
export const useAllTestWorkspace = () => {
  const { data: allTestWorkspaces } = useRequest(
    async () => {
      return getAllTestWorkspaces();
    },
    {
      cacheKey: 'AllTestWorkspaces',
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  return allTestWorkspaces;
};

export const useGetTestRepoGroup = (rowData: any) => {
  const { data: repoMap, loading } = useRequest(
    async () => {
      if (!rowData?.workspaceKey) return null;
      const repoData = await getRepositoryData([rowData?.workspaceKey]);

      const repoMap = handleRroupPath(getRepoData(repoData)).reduce((prev, cur) => {
        if (cur.objectId) {
          prev[cur.objectId] = cur.path;
        }
        return prev;
      }, {});

      return repoMap;
    },
    {
      cacheKey: `TextRepoGroup${rowData.workspaceKey}`,
      refreshDeps: [rowData.workspaceKey],
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  const data = repoMap?.[rowData.repository?.objectId ?? ''] ?? '未分组';

  return { data, loading };
};

export const useGetUserNameByName = (name: string) => {
  const { data } = useRequest(
    async () => {
      if (!name) return null;

      const [userInfo] = await new Parse.Query(Parse.User).containedIn('username', [name]).find();

      return userInfo.toJSON().nickname;
    },
    {
      cacheKey: `executor${name ?? ''}`,
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  return data ?? '';
};

/** 获取所有的测试管理配置 */
export const useAllTestConfigs = (
  selectedFields = ['itemTypeMap', 'defectsMapping', 'workspaceKey'],
) => {
  const { data: testConfigs } = useRequest(async () => getAllTestConfigs(selectedFields), {
    cacheTime: 99999999999,
    staleTime: 99999999999,
    cacheKey: 'allTestConfigs',
  });

  return testConfigs;
};

/** 获取测试管理类型关联的事项类型 */
export const useTestTypeUsedItemTypes = () => {
  const testConfigs = useAllTestConfigs();

  return React.useMemo(() => {
    const transformResult = (data: Record<string, Set<unknown>>) => {
      const results = {} as Record<TestType, string[]>;
      for (const [key, set] of Object.entries(data)) {
        results[key] = Array.from(set);
      }
      return results;
    };
    const testTypeUsedItemTypes = {
      [TestType.TestDetail]: new Set(),
      [TestType.TestPlan]: new Set(),
      [TestType.TestExecution]: new Set(),
    };

    if (!testConfigs) return transformResult(testTypeUsedItemTypes);
    const testConfigData = testConfigs.map(item => item.toJSON());

    testConfigData.forEach(data => {
      Object.keys(testTypeUsedItemTypes).forEach(key => {
        const itemTypeKey = data?.itemTypeMap?.[key];
        itemTypeKey && testTypeUsedItemTypes[key].add(itemTypeKey);
      });
    });

    return transformResult(testTypeUsedItemTypes);
  }, [testConfigs]);
};
