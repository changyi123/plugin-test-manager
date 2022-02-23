import { Test } from '@/lib/models';
import { hasArrayItem } from '@/lib/utils/helper';
import Parse from '@/lib/parse';
import { TestType, TestRelationType } from '@/lib/constants';
import {
  createTestRelation,
  createTestEntities,
  getTestEntitiesByRelation,
} from '@/lib/api/common';

/**
 * 创建测试执行
 */
export const createTestRunService = async (params: {
  workspaceKey: string;
  testDetailIds: string[];
}) => {
  const { workspaceKey, testDetailIds } = params;
  const entities = testDetailIds.map(id => ({
    type: TestType.TestRun,
    workspaceKey,
    fields: {
      runReferenceDetail: Test.createWithoutData(id),
    },
  }));
  return createTestEntities(entities);
};

// 创建测试执行
export const createTestExecutionService = async (params: {
  workspaceKey: string;
  testPlan: Parse.Object;
  testExecution: Parse.Object;
  relTestDetailIds?: string[];
}) => {
  /**
   *  s1. 查找所有的关联的测试用例
   *  s2. 创建测试执行事项
   *  s3. 创建测试执行实体
   *  s4. 处理关联关系，测试计划关联测试执行，测试执行关联测试执行
   */

  const { workspaceKey, testPlan, testExecution } = params;
  let relTestDetailIds = params.relTestDetailIds || [];

  // 没有 relTestDetails 则创建全部
  if (!hasArrayItem(relTestDetailIds)) {
    const res = await getTestEntitiesByRelation(
      TestRelationType.PlanRelDetail,
      { from: testPlan },
      // TODO: fetch all
      { queryParams: { limit: 9999 } },
    );
    relTestDetailIds = res.list.map(item => item.objectId);
  }

  const testRunEntities = await createTestRunService({
    workspaceKey,
    testDetailIds: relTestDetailIds,
  });

  const testPlanExecutionRelations = [
    {
      from: testPlan,
      to: testExecution,
      relationType: TestRelationType.PlanRelExecution,
    },
  ];

  // 测试执行&运行关联关系
  const testExecutionRunRelations = testRunEntities.map(runEntity => ({
    relationType: TestRelationType.ExecutionRelRun,
    from: testExecution,
    to: runEntity,
  }));

  // todo: 创建测试执行
  const relations = [].concat(testPlanExecutionRelations, testExecutionRunRelations);

  await createTestRelation(relations);

  return testExecution;
};

// 将测试用例添加至测试计划
export const addTestDetailToPlanService = async (params: {
  testPlan: Parse.Object;
  testDetailIds: string[];
}) => {
  const relations = params.testDetailIds.map(testDetailId => ({
    relationType: TestRelationType.PlanRelDetail,
    from: params.testPlan,
    to: testDetailId,
  }));
  return createTestRelation(relations);
};

export const getItemByTestId = (testIds: string[]): Promise<Array<Parse.Object>> => {
  return new Promise(resolve => {
    const query = new Parse.Query(Test);
    query.containedIn('objectId', testIds);
    query.include('reference');
    query.find().then((itemObjs: Array<Parse.Object>) => {
      resolve(itemObjs);
    });
  });
};
