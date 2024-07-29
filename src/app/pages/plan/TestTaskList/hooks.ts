import { useRequest } from 'ahooks';
import _ from 'lodash';

import { getStatsTestPlan, getTestEntityByQuery } from '@/lib/api/item';

const useGetTestPlanById = (id?: string, workspaceKey?: string) => {
  const data = useRequest(
    async () => {
      if (!id) return {};
      const { list: testPlan } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: 'TestPlan',
          id,
        },
      });

      const stats = await getStatsTestPlan({
        planIds: testPlan.map(d => d.objectId),
        select: ['caseStatus', 'caseCount', 'executionCount'],
      });

      const testPlans = _.chain(testPlan)
        .map(testPlan => {
          return {
            ...testPlan,
            ...stats?.[testPlan.objectId],
          };
        })
        .value();

      return testPlans?.[0];
    },
    {
      refreshDeps: [id, workspaceKey],
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  return data;
};

export default useGetTestPlanById;
