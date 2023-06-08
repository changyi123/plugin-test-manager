import { useRequest } from 'ahooks';
import { TestType } from 'common/constant';

import { getTestEntityByQuery } from '@/lib/api/item';

export const useGetReportLInkPLan = (linkPlanId: string[]) => {
  const { data } = useRequest(
    async () => {
      if (!linkPlanId?.length) return '';
      const { list } = await getTestEntityByQuery({
        query: {
          type: TestType.Plan,
          id: linkPlanId,
        },
        limit: linkPlanId?.length ?? 0,
      });
      return list;
    },
    {
      ready: Boolean(linkPlanId),
      cacheKey: `${linkPlanId?.toString()}`,
      refreshDeps: [linkPlanId],
      staleTime: -1,
    },
  );

  return data;
};
