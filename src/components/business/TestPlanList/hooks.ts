import { getTestEntitiesByQuery, getTestEntitiesByRelation } from '@/lib/api/common';
import { TestRelationType, TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { TestPlanEntity } from '@/pages/plan/type';
import { useRequest } from 'ahooks';
import _ from 'lodash';

type TestPlan = TestPlanEntity & {
  refTestDetails: Pick<TestEntity, 'status'>[];
};

const useGetTestPlanById = (id?: string, workspaceKey?: string) => {
  const { data, loading } = useRequest(
    async () => {
      if (!id) return {};
      const { results, count } = await getTestEntitiesByQuery(
        {
          in: [id ?? ''],
          workspaceKey,
          type: TestType.TestPlan,
        },
        {
          ignoreDeletedItemData: true,
          descendingBy: ['createdAt'],
        },
      );

      const { list: allRelationTestDetails } = await getTestEntitiesByRelation(
        TestRelationType.PlanRelDetail,
        {
          from: results.map(item => item.objectId),
        },
        {
          // FIXME: 优化查询速度
          workspaceKey,
          select: ['status'],
          include: ['status'],
          queryParams: { limit: 9999, offset: 0 },
        },
      );

      const testPlans = _.chain(results)
        .map(testPlan => {
          return {
            ...testPlan,
            refTestDetails: allRelationTestDetails.filter(
              testDetail => _.get(testDetail, 'relation.from.objectId') === testPlan.objectId,
            ),
          };
        })
        .value() as TestPlan[];

      return {
        list: testPlans,
        total: count,
      };
    },
    {
      cacheKey: `test_plan_${id ?? ''}`,
      refreshDeps: [id, workspaceKey],
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  return { data, loading };
};

export default useGetTestPlanById;
