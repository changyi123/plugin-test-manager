import { pick } from 'lodash';
import { useRequest } from 'ahooks';
import { TestType } from '@/lib/constants';
import { getTestEntitiesByRelation, getTestConfig } from '@/lib/api/common';

type GetTestEntityParams = Parameters<typeof getTestEntitiesByRelation>;
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
      const { list } = await getTestEntitiesByRelation(relType, sides, {
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

  return !(testConfig?.isolateTestType ?? []).includes(testType);
};
