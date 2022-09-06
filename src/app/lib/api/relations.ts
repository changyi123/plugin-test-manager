import { toArray } from '@/lib/utils/helper';
import { TestRelationType } from '@/lib/constants';
import { createTestRelation } from '@/lib/api/common';

type SingleType = string | Parse.Object;
type MultipleType = Array<SingleType> | SingleType;

/** 测试用例添加至测试计划 1:N */
export const createTestDetailToPlanRelations = async (params: {
  testPlan: SingleType;
  testDetail: MultipleType;
}) => {
  const relations = toArray(params.testDetail).map(testDetail => ({
    relationType: TestRelationType.PlanRelDetail,
    from: params.testPlan,
    to: testDetail,
  }));

  return createTestRelation(relations);
};

/** 将测试任务添加至测试计划 1:N */
export const createTestExecutionToPlanRelations = async (params: {
  testPlan: SingleType;
  testExecution: MultipleType;
}) => {
  const relations = toArray(params.testExecution).map(testExecution => ({
    relationType: TestRelationType.PlanRelExecution,
    from: params.testPlan,
    to: testExecution,
  }));

  return createTestRelation(relations);
};
