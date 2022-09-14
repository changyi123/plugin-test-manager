import { getlinkedTestEntityByQuery, getTestEntityByQuery } from '@/lib/api/item';
import { TestLinkType, TestType } from '@/lib/constants';
import { useRequest } from 'ahooks';
import _ from 'lodash';

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

      const { list: linkTestDetails } = await getlinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        linkType: TestLinkType.CaseLinkPlan,
        linkItems: [id],
        type: TestType.TestDetail,
      });

      const testPlans = _.chain(testPlan)
        .map(testPlan => {
          return {
            ...testPlan,
            refTestDetails: linkTestDetails.filter(d => d.linkItems.includes(testPlan.objectId)),
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
