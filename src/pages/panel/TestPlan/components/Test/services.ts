import { hasArrayItem } from '@/lib/utils/helper';
import { TestType, TestRelationType } from '@/lib/constants';
import { getTestEntitiesByRelation, createTestRelation } from '@/lib/api/common';

// 创建测试执行
export const createTestExecutionService = async (testPlan, testExecution, relTestDetails = []) => {
  /**
   *  s1. 查找所有的关联的测试用例
   *  s2. 创建测试执行事项
   *  s3. 创建测试运行实体
   *  s4. 处理关联关系，测试计划关联测试执行，测试执行关联测试运行
   */

  // 没有 relTestDetails 则创建全部
  if (!hasArrayItem(relTestDetails)) {
    const res = await getTestEntitiesByRelation(
      TestRelationType.PlanRelDetail,
      { from: testPlan },
      // TODO: fetch all
      { queryParams: { limit: 9999 } },
    );
    relTestDetails = res.list;
  }
  // todo: 创建测试运行
  const relations = [
    {
      from: testPlan,
      to: testExecution,
      relationType: TestRelationType.PlanRelExecution,
    },
  ].concat([]);

  await createTestRelation(relations);

  return testExecution;
};
