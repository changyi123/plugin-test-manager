import {
  InfinityLimit,
  IQLRequiredFieldKeys,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import { buildResponse } from '../../lib/apiUtil';
import { batchDeleteItems } from '../../lib/batchRequest';
import { iqlRequest } from '../../lib/iqlRequest';

export const deleteTestLink = async () => {
  const { item } = global as any;
  console.info('deleteTestLink ----------------->', item);
  if (!item) return;
  const itemId = item.objectId;
  const workspaceKey = item.workspace.key;
  const itemType = item.values.r_test_manager_type;

  const deleteItemsThenWait = id => {
    return Promise.race([
      new Promise(resolve => {
        // TODO: 留给有缘人优化
        console.info('deleteItemsThenWait--------------1500');
        setTimeout(resolve, 1500);
      }),
      batchDeleteItems(id),
    ]);
  };
  const tasks = [];

  try {
    // 测试用例删除时需要删除引用的测试执行，所以先获得用例引用的执行
    if (itemType === TestType.Case) {
      const getReferencedTestRunIds = async () => {
        // 1. 查询关联的 items
        const {
          data: { list: testRuns },
        } = await iqlRequest({
          query: {
            referenceCase: [itemId],
          },
          pagination: { limit: InfinityLimit },
          fields: IQLRequiredFieldKeys,
        });

        return testRuns?.map(item => item.objectId);
      };
      const testRunIds = await getReferencedTestRunIds();
      if (testRunIds?.length) {
        tasks.push(deleteItemsThenWait(testRunIds));
      }
    }

    // 删除测试执行任务，需要删除关联的测试执行
    if (itemType === TestType.Execution) {
      // 测试执行任务删除时需要删除任务下的测试执行
      const getRunIdByLInkItem = async () => {
        const {
          data: { list: runs },
        } = await iqlRequest({
          query: {
            workspaceKey,
          },
          linkQuery: {
            linkType: TestLinkType.RunLinkExecution,
            sourceIds: [itemId],
            destinationType: TestType.Run,
          },
          pagination: { limit: InfinityLimit },
          fields: IQLRequiredFieldKeys,
        });

        return runs?.map(item => item.objectId);
      };

      const runIds = await getRunIdByLInkItem();
      if (runIds?.length) {
        tasks.push(deleteItemsThenWait(runIds));
      }
    }

    // 删除测试计划，需要删除关联的测试执行任务
    if (itemType === TestType.Plan) {
      const getExecutionIdByLInkItem = async () => {
        const {
          data: { list: executions },
        } = await iqlRequest({
          query: {
            workspaceKey,
          },
          linkQuery: {
            linkType: TestLinkType.ExecutionLinkPlan,
            sourceIds: [itemId],
            destinationType: TestType.Execution,
          },
          pagination: { limit: InfinityLimit },
          fields: IQLRequiredFieldKeys,
        });

        return executions?.map(item => item.objectId);
      };
      const executionIds = await getExecutionIdByLInkItem();
      if (executionIds?.length) {
        tasks.push(deleteItemsThenWait(executionIds));
      }
    }

    if (tasks.length) {
      await Promise.all(tasks);
      return buildResponse('delete success');
    }
    return buildResponse('no data');
  } catch (error) {
    return buildResponse(error);
  }
};
