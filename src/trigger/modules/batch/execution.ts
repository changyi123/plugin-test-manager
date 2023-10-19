/**@file 测试执行任务更新操作 */
import { keyBy } from 'lodash';

import {
  InfinityLimit,
  SystemField,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import { AddTestExecuteToTestPlanPayload } from '../../../common/types/api';
import { TestEntity } from '../../../common/types/test';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchUpdateItems } from '../../lib/batchRequest';
import { buildTestEntityLinkData, generateSortIndex } from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';

/** 将测试执行添加至测试计划中 */
export const linkTestExecuteToTestPlan = async () => {
  /**
   *  1. 将测试执行任务和测试计划进行关联
   *  2. 将计划下存在的测试执行对应的用例关联至测试计划中
   *  3. 更新测试执行的执行状态至计划关联用例的 casaStatus 中
   */
  try {
    const { body: requestPayload } = getReqInfoFromVMRuntime<AddTestExecuteToTestPlanPayload>();

    if (!Array.isArray(requestPayload.testExecutionIds)) {
      throw new Error('testExecutionIds must be an array');
    } else if (!requestPayload.testPlanId) {
      throw new Error('testPlanId is required');
    }

    // 获取测试执行任务关联的所有测试执行
    const [
      {
        data: { list: linkedTestRuns },
      },
      {
        data: { list: linkedTestCases },
      },
    ] = await Promise.all([
      iqlRequest<TestEntity<TestType.Run>>({
        pagination: {
          limit: InfinityLimit,
        },
        linkQuery: {
          linkType: TestLinkType.RunLinkExecution,
          sourceIds: requestPayload.testExecutionIds,
          destinationType: TestType.Run,
        },
        fields: [
          SystemField.Id,
          TestFiledKeyMapping.status,
          TestFiledKeyMapping.executor,
          TestFiledKeyMapping.referenceCase,
        ],
      }),
      iqlRequest<TestEntity<TestType.Case>>({
        pagination: {
          limit: InfinityLimit,
        },
        linkQuery: {
          linkType: TestLinkType.CaseLinkPlan,
          sourceIds: requestPayload.testPlanId,
          destinationType: TestType.Case,
        },
        fields: [SystemField.Id, TestFiledKeyMapping.caseStatus, TestFiledKeyMapping.caseExecutor],
      }),
    ]);

    const Actions = {
      // 将测试执行任务和测试计划进行关联
      batchLinkExecutionToPlan: async () => {
        const { testPlanId, testExecutionIds } = requestPayload;
        // 获取测试用例关联类型
        const testEntityLinkData = await buildTestEntityLinkData(
          testExecutionIds.map(testExecutionId => ({
            objectId: testExecutionId,
            linkType: TestLinkType.ExecutionLinkPlan,
            type: TestType.Execution,
            linkItems: { action: 'add', value: [testPlanId] },
            sortIndex: generateSortIndex(),
          })),
        );

        // 批量更新实体数据管理
        await batchUpdateItems(testEntityLinkData);
      },
      // 将计划下存在的测试执行对应的用例关联至测试计划中，对于未被关联的测试用例则，创建事项更新数据时需要增加 caseStatus
      batchLinkCaseToPlan: async () => {
        const { testPlanId } = requestPayload;
        // 所有测试执行任务对应的测试用例

        const linkedCaseIdsSet = new Set(linkedTestCases.map(testCase => testCase.objectId));
        const unLinkedTestRuns = linkedTestRuns.filter(
          test => !linkedCaseIdsSet.has(test.referenceCase),
        );

        // 如果存在未被关联的测试用例再去更新
        if (unLinkedTestRuns.length) {
          // 获取将要更新的测试用例的 caseStatus
          const {
            data: { list: referenceTestCaseList },
          } = await iqlRequest<TestEntity<TestType.Case>>({
            query: {
              id: unLinkedTestRuns.map(run => run.objectId),
              type: TestType.Case,
            },
            pagination: {
              limit: InfinityLimit,
            },
            fields: [
              SystemField.Id,
              TestFiledKeyMapping.caseStatus,
              TestFiledKeyMapping.caseExecutor,
            ],
          });

          // id 类型映射
          const idToReferenceTestCaseMapping = keyBy(referenceTestCaseList, 'objectId');

          // 批量关联将测试用例和测试计划进行关联
          const testEntityLinkData = await buildTestEntityLinkData(
            unLinkedTestRuns.map(testRun => ({
              objectId: testRun.referenceCase,
              linkType: TestLinkType.CaseLinkPlan,
              type: TestType.Case,
              linkItems: { action: 'add', value: [testPlanId] },
              sortIndex: generateSortIndex(),
              // 更新事项最新执行状态
              caseStatus: {
                ...idToReferenceTestCaseMapping[testRun.referenceCase]?.caseStatus,
                [testPlanId]: testRun.status,
              },
              caseExecutor: {
                ...idToReferenceTestCaseMapping[testRun.referenceCase]?.caseExecutor,
                [testPlanId]: testRun.executor?.[0],
              },
            })),
          );

          // 批量更新实体数据管理
          await batchUpdateItems(testEntityLinkData);
        }
      },
      // TODO: 确认重新关联是否会把最新的用例执行状态给覆盖
      // 更新测试执行的执行状态至计划关联用例的 casaStatus 中
      batchUpdateCaseStatus: async () => {
        const { testPlanId } = requestPayload;
        const idToLinkedTestCaseMapping = keyBy(linkedTestCases, 'objectId');
        // 获取已经被关联的测试用例
        const caseStatusTestEntityData = linkedTestRuns
          .map(testRun => {
            const linkedTestCase = idToLinkedTestCaseMapping[testRun.referenceCase];
            // 不存在则直接跳过
            if (!linkedTestCase) return;

            return {
              objectId: linkedTestCase.objectId,
              caseStatus: {
                ...linkedTestCase.caseStatus,
                [testPlanId]: testRun.status,
              },
              caseExecutor: {
                ...linkedTestCase.caseExecutor,
                [testPlanId]: testRun.executor?.[0],
              },
            };
          })
          .filter(Boolean);

        // 更新测试用例实体数据
        await batchUpdateItems(caseStatusTestEntityData);
      },
    };

    await Promise.all([
      Actions.batchLinkExecutionToPlan(),
      Actions.batchLinkCaseToPlan(),
      Actions.batchUpdateCaseStatus(),
    ]);
    return buildResponse('success');
  } catch (err) {
    return buildResponse(err);
  }
};
