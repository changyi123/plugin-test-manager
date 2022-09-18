/**
 * @file 测试用例相关统计
 */
import { iqlRequest } from '../../lib/iqlRequest';
import { TestEntity } from '../../../common/types/test';
import { getReqInfoFromVMRuntime, buildResponse } from '../../lib/apiUtil';
import { TestExecutionStats, TestPlanStatsPayload } from '../../../common/types/api';
import {
  TestType,
  TestLinkType,
  InfinityLimit,
  TestFiledKeyMapping,
} from '../../../common/constant';

type TestRunEntityType = TestEntity<TestType.Run>;
type TestCaseEntityType = TestEntity<TestType.Case>;
type TestExecutionEntityType = TestEntity<TestType.Execution>;

const buildStatusResult = (ids, selectKeys) => {
  // {[id]: Record<selectKeys>: undefined}
  return ids.reduce(
    (acc, id) => ({
      ...acc,
      [id]: Object.fromEntries(selectKeys.map(key => [key])),
    }),
    {},
  );
};

/**
 * 测试计划统计数据
 * （规划用例数，最新用例通过率，执行任务）
 */
export const testPlanStats = async () => {
  const {
    body: { select = [], planIds },
  } = getReqInfoFromVMRuntime<TestPlanStatsPayload>();

  try {
    // 创建
    const result = buildStatusResult(planIds, select);
    // 测试执行用例统计数据
    if (select.includes('caseStatus') || select.includes('caseCount')) {
      const {
        data: { list: testCase },
      } = await iqlRequest<TestCaseEntityType>({
        linkQuery: {
          sourceIds: planIds,
          linkType: TestLinkType.CaseLinkPlan,
          destinationType: TestType.Case,
        },
        fields: [TestFiledKeyMapping.caseStatus, TestFiledKeyMapping.linkItems],
        pagination: { limit: InfinityLimit, offset: 0 },
      });

      console.info('testCase --->', testCase);

      testCase.forEach(item => {
        const { caseStatus, source } = item;
        // 统计状态数据
        if (caseStatus && select.includes('caseStatus')) {
          Object.entries(caseStatus).forEach(([planId, statusKey]) => {
            // 不在 result plan 中的数据不需要被统计
            if (!Object.hasOwnProperty.call(result, planId)) return;
            const planStats = result[planId];
            planStats.caseStatus = {
              ...planStats.caseStatus,
              [statusKey]: planStats.caseStatus?.[statusKey] ?? 0 + 1,
            };
          });
        }

        // 统计用力数量
        if (source && select.includes('caseCount')) {
          source.forEach(planId => {
            // 不在 result plan 中的数据不需要被统计
            if (!Object.hasOwnProperty.call(result, planId)) return;
            const planStats = result[planId];
            planStats.caseCount = (planStats.caseCount ?? 0) + 1;
          });
        }
      });
    }

    // 测试执行任务统计数据
    if (select.includes('executionCount')) {
      const {
        data: { list: testExecution },
      } = await iqlRequest<TestExecutionEntityType>({
        linkQuery: {
          sourceIds: planIds,
          linkType: TestLinkType.ExecutionLinkPlan,
          destinationType: TestType.Execution,
        },
        fields: [TestFiledKeyMapping.linkItems],
        pagination: { limit: InfinityLimit, offset: 0 },
      });

      console.info('testExecution --->', testExecution);

      testExecution.forEach(item => {
        const { linkItems } = item;

        // 统计测试执行数量
        if (select.includes('executionCount')) {
          linkItems.forEach(planId => {
            // 不在 result plan 中的数据不需要被统计
            if (!Object.hasOwnProperty.call(result, planId)) return;
            const planStats = result[planId];
            planStats.executionCount = (planStats.executionCount ?? 0) + 1;
          });
        }
      });
    }
    return buildResponse(result);
  } catch (err) {
    return buildResponse(err);
  }
};

/**
 * 测试执行统计
 * （测试执行通过率）
 */
export const testExecutionStats = async () => {
  const {
    body: { select = [], executionIds },
  } = getReqInfoFromVMRuntime<TestExecutionStats>();

  try {
    // 创建
    const result = buildStatusResult(executionIds, select);
    // 测试执行用例统计数据
    if (select.includes('runStatus')) {
      const {
        data: { list: testRuns },
      } = await iqlRequest<TestRunEntityType>({
        linkQuery: {
          sourceIds: executionIds,
          linkType: TestLinkType.RunLinkExecution,
          destinationType: TestType.Run,
        },
        fields: [TestFiledKeyMapping.status, TestFiledKeyMapping.linkItems],
        pagination: { limit: InfinityLimit, offset: 0 },
      });

      console.info('testRuns --->', testRuns);

      testRuns.forEach(item => {
        const { status, source } = item;
        // 统计状态数据
        if (status && select.includes('runStatus')) {
          source.forEach(executionId => {
            if (!Object.hasOwnProperty.call(result, executionId)) return;
            const executionStats = result[executionId];
            executionStats.runStatus = {
              ...executionStats.runStatus,
              [status]: (executionStats.runStatus ?? 0) + 1,
            };
          });
        }
      });
    }

    return buildResponse(result);
  } catch (err) {
    return buildResponse(err);
  }
};
