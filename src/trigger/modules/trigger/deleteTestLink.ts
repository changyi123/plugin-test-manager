import { i18n } from '@giteeteam/apps-api';

import {
  InfinityLimit,
  IQLRequiredFieldKeys,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import { buildResponse } from '../../lib/apiUtil';
import {
  batchDeleteItems,
  batchUpdateItemsValues,
  updateExecutionCases,
} from '../../lib/batchRequest';
import { iqlRequest } from '../../lib/iqlRequest';

export const deleteTestLink = async () => {
  const { item } = global as any;
  if (!item) return;
  const itemId = item.objectId;
  const workspaceKey = item.workspace.key;
  const itemType = item.values.r_test_manager_type;

  const tasks = [];

  let fn;

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
          fields: [
            ...IQLRequiredFieldKeys,
            TestFiledKeyMapping.referenceCaseSnapshot,
            TestFiledKeyMapping.referenceCase,
            TestFiledKeyMapping.linkItems,
          ],
        });

        console.info('deleteTestLink ---testRuns', JSON.stringify(testRuns));

        const deleteIds =
          testRuns?.filter(i => !i.referenceCaseSnapshot)?.map(item => item.objectId) ?? [];
        const updateIds =
          testRuns?.filter(i => i.referenceCaseSnapshot)?.map(item => item.objectId) ?? [];

        const executionIdSet = new Set();
        testRuns?.forEach(item => {
          const executionId = item?.linkItems?.[0];
          if (executionId) {
            executionIdSet.add(executionId);
          }
        });

        console.info('deleteTestLink executionIds', JSON.stringify([...executionIdSet]));

        return {
          deleteIds,
          updateIds,
          executionIdSet,
        };
      };
      const { deleteIds, updateIds, executionIdSet } = await getReferencedTestRunIds();
      if (deleteIds?.length) {
        tasks.push(batchDeleteItems(deleteIds));
      }
      if (updateIds?.length) {
        tasks.push(
          batchUpdateItemsValues(
            updateIds.map(id => ({
              objectId: id,
              referenceCase: '',
            })),
          ),
          true,
        );
      }
      if (executionIdSet.size) {
        fn = async () => {
          await updateExecutionCases([...executionIdSet]);
        };
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

      const checkRun = global.env?.CHECK_RUN_FOR_DELETE_EXECUTION;

      console.info('checkRun', checkRun, runIds?.length);
      if (checkRun && runIds?.length) {
        throw new Error(i18n.t('trigger.checkRun'));
      }

      if (runIds?.length) {
        tasks.push(batchDeleteItems(runIds));
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
        tasks.push(batchDeleteItems(executionIds));
      }
    }

    if (tasks.length) {
      await Promise.all(tasks);

      typeof fn === 'function' && (await fn());
      return buildResponse('delete success');
    }
    return buildResponse('no data');
  } catch (error) {
    console.info('delete items error', error);
    if (error?.message === i18n.t('trigger.checkRun')) {
      throw error;
    }
    return buildResponse(error);
  }
};
