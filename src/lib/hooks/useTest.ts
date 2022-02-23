import { useRequest } from 'ahooks';
import { pick } from 'lodash';
import { getTestEntitiesByRelation } from '@/lib/api/common';

type GetTestEntityParams = Parameters<typeof getTestEntitiesByRelation>;
// 查询所有事项实体 id
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
  const { data, mutate, refresh } = useRequest(async () => {
    const { list } = await getTestEntitiesByRelation(relType, sides, {
      include,
      useSelect: true,
      queryParams: { limit: 9999 },
    });
    return list?.map(item => (include?.length === 1 ? item.objectId : pick(item, include)));
  });

  return {
    mutate,
    refresh,
    testEntities: data ?? [],
  };
};
