import { useRequest } from 'ahooks';
// import { Options } from 'ahooks/lib/useRequest/src/types';
import { getTestEntitiesByRelation } from '@/lib/api/common';

type GetTestEntityParams = Parameters<typeof getTestEntitiesByRelation>;
// 查询所有事项实体 id
export const useAllRelTestEntityIds = (
  relType: GetTestEntityParams['0'],
  sides: GetTestEntityParams['1'],
) => {
  const { data, mutate, refresh } = useRequest(async () => {
    const { list } = await getTestEntitiesByRelation(relType, sides, {
      include: ['objectId'],
      useSelect: true,
      queryParams: { limit: 9999 },
    });
    return list?.map(item => item.objectId);
  });

  return {
    testEntityIds: data ?? [],
    mutate,
    refresh,
  };
};
