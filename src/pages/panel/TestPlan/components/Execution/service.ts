import { TestRelationType } from '@/lib/constants';
import { createTestRelation } from '@/lib/api/common';

// 将测试用例添加至测试计划
export const addTestExecutionToPlanService = async (params: {
  testPlan: Parse.Object;
  testExecutionIds: string[];
}) => {
  const relations = params.testExecutionIds.map(testExecutionId => ({
    relationType: TestRelationType.PlanRelExecution,
    from: params.testPlan,
    to: testExecutionId,
  }));
  return createTestRelation(relations);
};
