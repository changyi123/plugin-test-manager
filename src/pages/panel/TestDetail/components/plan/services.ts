import { TestRelationType } from '@/lib/constants';
import { createTestRelation } from '@/lib/api/common';

// 创建测试计划
export const createTestPlanService = async (testDetail, testPlan) => {
  return createTestRelation([
    {
      relationType: TestRelationType.PlanRelDetail,
      from: testPlan,
      to: testDetail,
    },
  ]);
};
