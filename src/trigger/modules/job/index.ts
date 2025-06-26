import { getParseModel, getParseQuery, saveAllObject } from '@giteeteam/apps-team-api';
import { groupBy } from 'lodash';

import {
  InfinityLimit,
  SystemField,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import {
  AddExecuteToPlanPayload,
  BatchCopyTestCaseV3Payload,
  BatchCreateTestRunV2Payload,
  BatchDeletePayload,
  CopyFolderPayload,
  IBatchUpdateParams,
  RemoveCaseFromPlanPayload,
  RemoveExecuteFromPlanPayload,
  RetryPayload,
} from '../../../common/types/api';
import { TestEntity } from '../../../common/types/test';
import { buildResponse } from '../../lib/apiUtil';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchUpdateItemsValues, updateExecutionCases } from '../../lib/batchRequest';
import {
  batchCreateItemsV2,
  batchUpdateItemsV2 as originBatchUpdateItemsV2,
  deleteItems,
  operateSnapshots,
} from '../../lib/coreApi';
import {
  generateSortIndex,
  getAllEntity,
  getMaxSortIndex,
  insertBatchRecord,
  updateBatchRecordsDone,
  updateProcessBar,
} from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';

type TestRunType = TestEntity<TestType.Run>;
type ProcessJobParams<T> = T & {
  processId?: string;
  retry?: boolean;
};

const DEFAULT_CONFIG = {
  ITEMS_V2: {
    batchSize: 100,
  },
  DELETE_V1: {
    batchSize: 10,
  },
  REMOVE_CASE: {
    batchSize: 100,
  },
};

async function handleError(error, retry, result, processId) {
  result.message.push(getErrorMessage(error));
  processId && (await updateProcessBar(processId, -1, JSON.stringify(result)));
  if (retry) throw error;
  return buildResponse(result);
}

function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

function safeToString(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;

  try {
    return typeof value === 'object' ? safeStringify(value) : String(value);
  } catch (e) {
    return Object.prototype.toString.call(value);
  }
}

function getErrorMessage(error) {
  return safeToString(
    error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.response?.data ??
      error?.message ??
      error,
  );
}

function getResult(retryId) {
  return {
    retryId,
    message: [],
    total: 0,
    fail: 0,
    success: 0,
    skip: 0,
    items: [],
  };
}

const itemsV2BatchSize = (global.env?.BATCH_CONFIG?.ITEMS_V2 ?? DEFAULT_CONFIG.ITEMS_V2).batchSize;
const deleteBatchSize = (global.env?.BATCH_CONFIG?.DELETE_V1 ?? DEFAULT_CONFIG.DELETE_V1).batchSize;
const removeCaseBatchSize = (global.env?.BATCH_CONFIG?.DELETE_V1 ?? DEFAULT_CONFIG.REMOVE_CASE)
  .batchSize;

const getHeaders = () => ({
  'X-Parse-Application-Id': global.applicationId,
  'X-Parse-Session-Token': global.body?.sessionToken || global.sessionToken,
  'Company-Current': global.applicationId,
  'HEADER-USERINFO': global.sessionToken,
});

// 批量编辑时根据状态分组
const batchUpdateItemsV2 = async props => {
  const { items: itemIds, ...updateParams } = props;
  const updatedItems = await getAllEntity({ query: { id: itemIds } }, ['id', SystemField.Status]);
  const diffItems = groupBy(updatedItems, 'workflowStatus.objectId');
  return await Promise.all(
    Object.values(diffItems).map(async items => {
      if (!items?.length) return [];
      return await originBatchUpdateItemsV2(
        {
          items: items.map(i => i.objectId),
          ...updateParams,
        },
        getHeaders(),
      );
    }),
  );
};

const getProcessValue = (index, step) => {
  // 进度条向上取整，优化进度条开始进度
  let processValue = Math.ceil((index * 100) / step);
  // 向上取整为100，但是未走完则为99
  if (processValue === 100 && index < step) processValue = 99;
  return processValue;
};

const batchExecFunction = async ({ list, fun, batchSize }) => {
  const step = Math.ceil(list.length / batchSize);

  for (let index = 1; index <= step; index++) {
    const size = list.length > batchSize ? batchSize : list.length;
    const items = list.splice(0, size);
    await fun(items, getProcessValue(index, step));
  }
};

const execWithProcess = async ({
  processId,
  list,
  execFunc,
  getDesc,
  batchSize,
  getBatchRecord,
}) => {
  const fun = async (items, processValue) => {
    try {
      await execFunc(items);
    } catch (e) {
      console.error('execWithProcess error:', e.message);
      const params = getBatchRecord(items, e);
      params && (await insertBatchRecord({ ...params, items }));
    } finally {
      await updateProcessBar(processId, processValue, getDesc());
    }
  };

  await batchExecFunction({
    list,
    fun,
    batchSize,
  });
};

export const createTestRuns = async (params: ProcessJobParams<BatchCreateTestRunV2Payload>) => {
  const { execution, caseIds, workspace, processId, planId, retry } = params;
  const result = getResult(processId);
  result.total = caseIds.length;
  const withProcess = !!processId;
  try {
    // 初始的执行状态
    const StartStatusKey = 'TODO';
    const runItemType = await getParseQuery(false, 'ItemType')
      .equalTo('key', 'test_manager_run')
      .select(['objectId'])
      .first({
        useMasterKey: true,
        context: {
          displayModule: 'plugin.testManager',
        },
      });
    if (!runItemType) {
      console.error('runItemType not found');
      return;
    }

    // 获取快照配置
    const getCaseSnapshotEnabled = async () => {
      let caseSnapshotEnabled = undefined;
      // 如果 ENABLED_CASE_SNAPSHOT 为 true 开启快照空间配置，需要查询空间的快照配置
      if (global.env?.ENABLED_CASE_SNAPSHOT) {
        caseSnapshotEnabled = await getParseQuery(false, 'test_manager_TestConfig')
          .equalTo('workspaceKey', workspace.key)
          .select(['enableCaseSnapshot'])
          .first({ useMasterKey: true })
          .then(data => data?.get('enableCaseSnapshot'));
      }

      // 没有快照配置 则以默认值 DEFAULT_ENABLED_CASE_SNAPSHOT 为准
      return caseSnapshotEnabled ?? global.env?.DEFAULT_ENABLED_CASE_SNAPSHOT;
    };

    // 获取测试管理已关联的测试执行
    const getExistedTestRuns = async (cases, fields = []) => {
      console.info('batchCreateTestRunV2 getExistedTestRuns start');
      const {
        data: { list: existedReferenceCaseIds },
      } = await iqlRequest<TestRunType>({
        query: {
          referenceCase: cases,
        },
        pagination: { limit: InfinityLimit },
        linkQuery: {
          sourceIds: execution.objectId,
          destinationType: TestType.Run,
          linkType: TestLinkType.RunLinkExecution,
        },
        fields: [TestFiledKeyMapping.referenceCase, ...fields],
      });
      console.info('batchCreateTestRunV2 getExistedTestRuns end');

      return existedReferenceCaseIds;
    };

    // 校验需要规划的用例
    const validateCases = async cases => {
      console.info('batchCreateTestRunV2 validateCases start');
      const existedReferenceCases = await getExistedTestRuns(cases);
      const existedReferenceCaseIdSet = new Set(
        existedReferenceCases.map(item => item.referenceCase),
      );
      const validatedCases = cases.filter(testCase => !existedReferenceCaseIdSet.has(testCase));
      result.skip += cases.length - validatedCases.length;
      return validatedCases;
    };

    // 创建测试执行
    const createRuns = async cases => {
      console.info('batchCreateTestRunV2 createRuns start');
      const createParams = {
        from: cases,
        fields: {
          [TestFiledKeyMapping.linkItems]: [execution.objectId],
          [TestFiledKeyMapping.testExecutions]: [execution.objectId],
          [TestFiledKeyMapping.linkType]: TestLinkType.RunLinkExecution,
          [TestFiledKeyMapping.type]: TestType.Run,
          [TestFiledKeyMapping.status]: StartStatusKey,
          [TestFiledKeyMapping.detail]: undefined,
          [TestFiledKeyMapping.plan]: planId,
        },
        itemType: runItemType.get('objectId'),
        workspace: workspace.objectId,
        update: {
          [TestFiledKeyMapping.referenceCase]: {
            copy: 'objectId',
            valueType: 'item',
          },
          [TestFiledKeyMapping.testCases]: {
            copy: 'objectId',
            valueType: 'item',
            fieldType: 'DataQuote',
          },
          [TestFiledKeyMapping.runDetail]: {
            copy: TestFiledKeyMapping.detail,
          },
        },
      };

      await batchCreateItemsV2(
        {
          items: createParams,
          parseContext: {
            // 跳过事项创建校验
            skipFormValidation: true,
            // 跳过隐藏事项类型过滤
            skipItemTypeQueryFilter: true,
            // 跳过层级校验
            skipItemValidationLevel: true,
            // 跳过 ItemForest
            skipItemForest: true,
          },
        },
        getHeaders(),
      );
    };
    // 对用例打快照
    const snapshotCases = async cases => {
      console.info(`batchCreateTestRunV2 snapshotCases cases: ${cases.length}`);
      let caseSnapshotMap = {};
      const {
        data: { list: caseList },
      } = await iqlRequest({
        query: {
          id: cases,
        },
        fields: [SystemField.Key],
        pagination: {
          offset: 0,
          limit: cases.length,
        },
      });
      console.info(`batchCreateTestRunV2 snapshotCases caseList: ${caseList.length}`);

      if (caseList.length) {
        const snapshots = await operateSnapshots({
          add: {
            keys: caseList.map(i => i.key),
          },
          sourceId: execution.objectId,
          sourceType: appKey,
          baseLineItemVersion: {
            name: execution.name,
          },
        });
        caseSnapshotMap = snapshots?.baselineItems?.reduce(
          (m, v) => ({ ...m, [v.itemId]: v.objectId }),
          caseSnapshotMap,
        );
      }
      console.info(`batchCreateTestRunV2 snapshotCases: `, caseSnapshotMap);
      return caseSnapshotMap;
    };

    // 把快照更新到用例的字段上
    const updateRunsReference = async (runCaseMap, caseSnapshotMap) => {
      const updatedRuns = [];
      for (const runId in runCaseMap) {
        updatedRuns.push({
          objectId: runId,
          referenceCaseSnapshot: caseSnapshotMap[runCaseMap[runId]],
        });
      }

      if (!updatedRuns.length) return;
      return await batchUpdateItemsValues(updatedRuns, true);
    };

    // 创建测试用例快照
    // 1. 获取用例所属空间是否支持规划时批量快照
    // 2. 创建测试用例快照
    const createCaseSnapshot = async cases => {
      console.info('batchCreateTestRunV2 createCaseSnapshot start');
      const caseSnapshotEnabled = await getCaseSnapshotEnabled();
      console.info(`batchCreateTestRunV2 createCaseSnapshot: ${caseSnapshotEnabled}`);
      if (!caseSnapshotEnabled) return;
      const existedRuns = await getExistedTestRuns(cases, [
        SystemField.Id,
        TestFiledKeyMapping.referenceCase,
      ]);
      const existedRunsMap = existedRuns.reduce(
        (prev, cur) => ({ ...prev, [cur[SystemField.Id]]: cur.referenceCase }),
        {},
      );
      const existedReferenceCaseIdSet = new Set(existedRuns.map(item => item.referenceCase));

      const caseSnapshotMap = await snapshotCases([...existedReferenceCaseIdSet]);

      await updateRunsReference(existedRunsMap, caseSnapshotMap);
      console.info('batchCreateTestRunV2 createCaseSnapshot end');
    };

    // 把所属计划更新到用例的引用字段上
    const updateCaseLinkPlan = async cases => {
      if (!planId || !cases.length) return;
      const updateParams = {
        items: cases,
        fields: {
          values: {
            [TestFiledKeyMapping.linkType]: TestLinkType.CaseLinkPlan,
          },
        },
        update: {
          [TestFiledKeyMapping.linkItems]: {
            concat: [planId],
          },
          [TestFiledKeyMapping.testPlans]: {
            concat: [planId],
          },
        },
      };
      return await batchUpdateItemsV2(updateParams);
    };

    // 对用例打快照
    const planCases = async cases => {
      try {
        // 校验测试用例是否已经被规划进测试执行任务
        const needPlanCases = await validateCases(cases);
        if (!needPlanCases.length) return;

        // 创建测试执行
        await createRuns(needPlanCases);

        // 根据配置，对测试用例打快照
        await createCaseSnapshot(needPlanCases);

        // 更新测试用例上的
        await updateCaseLinkPlan(needPlanCases);

        // 更新测试执行任务规划的用例数量
        await updateExecutionCases([execution.objectId]);
        result.success += needPlanCases.length;
      } catch (e) {
        result.message.push(getErrorMessage(e));
        result.fail += cases.length;
        result.items = result.items.concat(cases);
        throw e;
      } finally {
        console.info('batchCreateTestRunV2 createRuns end');
      }
    };
    if (withProcess)
      await execWithProcess({
        processId,
        execFunc: planCases,
        list: caseIds,
        getDesc: () => JSON.stringify(result),
        batchSize: itemsV2BatchSize,
        getBatchRecord: (items, error) => ({
          retryId: processId,
          type: 'createTestRuns',
          params: {
            ...params,
            caseIds: items,
          },
          error,
        }),
      });
    else if (retry) await planCases(caseIds);
    else
      await batchExecFunction({
        list: caseIds,
        fun: planCases,
        batchSize: itemsV2BatchSize,
      });

    return buildResponse(result);
    // 查询测试执行任务
  } catch (err) {
    return handleError(err, retry, result, processId);
  }
};

/** 批量创建测试执行任务 */
export const createTestRunsJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<BatchCreateTestRunV2Payload>>();

  return await createTestRuns(body);
};

export const updateItemsV2 = async (props: ProcessJobParams<IBatchUpdateParams>) => {
  const { processId, retry, items, ...updatePropParams } = props;
  const withProcess = !!processId;
  const result = getResult(processId);
  result.total = items.length;
  try {
    const updateItems = async items => {
      const updateParams = {
        ...updatePropParams,
        items: items,
        asynchronous: false,
      };

      try {
        await batchUpdateItemsV2(updateParams);
        result.success += items.length;
      } catch (e) {
        result.message.push(getErrorMessage(e));
        result.fail += items.length;
        result.items = result.items.concat(items);
        throw e;
      }
    };

    if (withProcess)
      await execWithProcess({
        processId,
        execFunc: updateItems,
        list: items,
        getDesc: () => JSON.stringify(result),
        batchSize: itemsV2BatchSize,
        getBatchRecord: (items, error) => ({
          retryId: processId,
          type: 'updateItemsV2',
          params: {
            ...props,
            items,
          },
          error,
        }),
      });
    else if (retry) await updateItems(items);
    else
      await batchExecFunction({
        list: items,
        fun: updateItems,
        batchSize: itemsV2BatchSize,
      });

    return buildResponse(result);
  } catch (err) {
    return handleError(err, retry, result, processId);
  }
};

export const updateItemsV2Job = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<IBatchUpdateParams>>();
  return await updateItemsV2(body);
};

export const copyTesCases = async (params: ProcessJobParams<BatchCopyTestCaseV3Payload>) => {
  const {
    retry,
    caseIds,
    itemType: itemTypeKey,
    workspace,
    repository,
    processId,
    needSuffix,
  } = params;
  const result = getResult(processId);
  result.total = caseIds.length;
  const copyName = i18n.t('trigger.copyName');
  const withProcess = !!processId;
  try {
    const itemType = await getParseQuery(false, 'ItemType')
      .equalTo('key', itemTypeKey)
      .select(['objectId'])
      .first({
        useMasterKey: true,
        context: {
          displayModule: 'plugin.testManager',
        },
      });

    if (!itemType) {
      console.error('case itemType not found');
      return;
    }

    const maxSortIndex = await getMaxSortIndex(`id in ${JSON.stringify(caseIds)}`);
    const sortIndexAddStep = generateSortIndex() - maxSortIndex;

    const createCases = async cases => {
      const createParams = {
        from: cases,
        fields: {
          [TestFiledKeyMapping.linkItems]: [],
          [TestFiledKeyMapping.testPlans]: [],
          [TestFiledKeyMapping.linkType]: '',
        },
        update: {
          [TestFiledKeyMapping.sortIndex]: {
            add: sortIndexAddStep,
          },
        },
        itemType: itemType.get('objectId'),
        workspace: workspace.objectId,
      };

      if (repository) createParams.fields[TestFiledKeyMapping.repository] = repository;
      else
        createParams.update[TestFiledKeyMapping.repository] = {
          copy: TestFiledKeyMapping.repository,
        };

      if (needSuffix)
        createParams.update[SystemField.Name] = {
          add: `_${copyName}`,
          keyType: 'item',
          valueType: 'item',
        };
      try {
        await batchCreateItemsV2(
          {
            items: createParams,
            parseContext: {
              // 跳过 ItemForest
              skipItemForest: true,
            },
          },
          getHeaders(),
        );
        result.success += cases.length;
      } catch (e) {
        result.message.push(getErrorMessage(e));
        result.fail += cases.length;
        result.items = result.items.concat(cases);
        throw e;
      } finally {
        console.info('batchCreateTestRunV2 createRuns end');
      }
    };

    if (withProcess)
      await execWithProcess({
        processId,
        execFunc: createCases,
        list: caseIds,
        getDesc: () => JSON.stringify(result),
        batchSize: itemsV2BatchSize,
        getBatchRecord: (items, error) => ({
          retryId: processId,
          type: 'copyTesCases',
          params: {
            ...params,
            caseIds: items,
          },
          error,
        }),
      });
    else if (retry) await createCases(caseIds);
    else
      await batchExecFunction({
        list: caseIds,
        fun: createCases,
        batchSize: itemsV2BatchSize,
      });

    return buildResponse(result);
  } catch (err) {
    return handleError(err, retry, result, processId);
  }
};

/** 批量复制测试用例 */
export const copyTesCasesJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<BatchCopyTestCaseV3Payload>>();
  return await copyTesCases(body);
};

export const batchDeleteItems = async ({
  ids: itemIds,
  retry,
  processId,
}: ProcessJobParams<BatchDeletePayload>) => {
  const result = getResult(processId);
  result.total = itemIds.length;
  const withProcess = !!processId;
  try {
    const deleteChunkItems = async items => {
      try {
        const res = await deleteItems(items, getHeaders());
        const errors = res?.filter(i => i.status !== 'success');
        result.success += items.length - errors.length;
        result.fail += errors.length;
        result.items = result.items.concat(errors.map(i => i.objectId));
        if (errors.length) {
          result.message.push(errors[0]?.message);
        }
      } catch (e) {
        result.message.push(getErrorMessage(e));
        result.fail += items.length;
        result.items = result.items.concat(items);
        throw e;
      } finally {
        console.info('deleteChunkItems end');
      }
    };
    const items = itemIds.map(objectId => ({ objectId }));

    if (withProcess)
      await execWithProcess({
        processId,
        execFunc: deleteChunkItems,
        list: items,
        getDesc: () => JSON.stringify(result),
        batchSize: deleteBatchSize,
        getBatchRecord: (items, error) => ({
          retryId: processId,
          type: 'batchDeleteItems',
          params: {
            ids: items,
          },
          error,
        }),
      });
    else if (retry) await deleteChunkItems(items);
    else
      await batchExecFunction({
        list: items,
        fun: deleteChunkItems,
        batchSize: itemsV2BatchSize,
      });

    return buildResponse(result);
  } catch (err) {
    return handleError(err, retry, result, processId);
  }
};

export const batchDeleteItemsJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<BatchDeletePayload>>();

  return await batchDeleteItems(body);
};

export const removeCaseFromPlanWorker = async (
  props: ProcessJobParams<RemoveCaseFromPlanPayload>,
) => {
  const { processId, caseIds, planId, retry } = props;
  const withProcess = !!processId;
  const result = getResult(processId);
  result.total = caseIds.length;
  try {
    const removeCases = async cases => {
      const updateParams = {
        update: {
          [TestFiledKeyMapping.linkItems]: {
            remove: planId,
          },
          [TestFiledKeyMapping.testPlans]: {
            remove: planId,
          },
        },
        fields: {},
        items: cases,
        asynchronous: false,
      };

      try {
        await batchUpdateItemsV2(updateParams);
        const runs = await getAllEntity(
          {
            query: { referenceCase: cases, plan: planId, type: TestType.Run },
          },
          ['id', TestFiledKeyMapping.linkItems],
        );

        console.info('removeCaseFromPlanWorker runs', JSON.stringify(runs));

        const runIds = [];
        const executionIdSet = new Set();
        runs.forEach(runData => {
          runIds.push(runData.objectId);

          const executionId = runData?.linkItems?.[0];
          if (executionId) {
            executionIdSet.add(executionId);
          }
        });

        console.info(
          'removeCaseFromPlanWorker',
          runIds.length,
          cases.length,
          JSON.stringify([...executionIdSet]),
        );
        if (runIds.length) await batchDeleteItems({ ids: runIds });
        // 更新测试执行任务
        if (executionIdSet.size) {
          await updateExecutionCases([...executionIdSet]);
        }

        result.success += cases.length;
      } catch (e) {
        result.message.push(getErrorMessage(e));
        result.fail += cases.length;
        result.items = result.items.concat(cases);
        throw e;
      }
    };

    if (withProcess)
      await execWithProcess({
        processId,
        execFunc: removeCases,
        list: caseIds,
        getDesc: () => JSON.stringify(result),
        batchSize: removeCaseBatchSize,
        getBatchRecord: (items, error) => ({
          retryId: processId,
          params: {
            ...props,
            caseIds: items,
          },
          type: 'removeCaseFromPlanWorker',
          error,
        }),
      });
    else if (retry) await removeCases(caseIds);
    else
      await batchExecFunction({
        list: caseIds,
        fun: removeCases,
        batchSize: removeCaseBatchSize,
      });

    return buildResponse(result);
  } catch (err) {
    return handleError(err, retry, result, processId);
  }
};

export const removeCaseFromPlanJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<RemoveCaseFromPlanPayload>>();
  return await removeCaseFromPlanWorker(body);
};

export const removeExecutionFromPlanWorker = async (
  props: ProcessJobParams<RemoveExecuteFromPlanPayload>,
) => {
  const { processId, executionIds, retry } = props;
  const withProcess = !!processId;
  const result = getResult(processId);
  try {
    const removeExecutionParams = {
      fields: {
        values: {
          [TestFiledKeyMapping.linkItems]: [],
          [TestFiledKeyMapping.testPlans]: [],
        },
      },
      items: executionIds,
      asynchronous: false,
    };
    await batchUpdateItemsV2(removeExecutionParams);
    const runIds = await getAllEntity({
      query: {
        type: TestType.Run,
        linkType: TestLinkType.RunLinkExecution,
        linkItems: [executionIds],
      },
    });
    result.total = runIds.length;

    const removeRunFromPlan = async items => {
      const updateParams = {
        fields: {
          values: {
            [TestFiledKeyMapping.plan]: '',
          },
        },
        items: items,
        asynchronous: false,
      };

      try {
        await batchUpdateItemsV2(updateParams);
        result.success += items.length;
      } catch (e) {
        result.message.push(getErrorMessage(e));
        result.fail += items.length;
        result.items = result.items.concat(items);
        throw e;
      }
    };

    if (withProcess)
      await execWithProcess({
        processId,
        execFunc: removeRunFromPlan,
        list: runIds,
        getDesc: () => JSON.stringify(result),
        batchSize: itemsV2BatchSize,
        getBatchRecord: () => false,
      });
    else
      await batchExecFunction({
        list: runIds,
        fun: removeRunFromPlan,
        batchSize: itemsV2BatchSize,
      });

    return buildResponse(result);
  } catch (err) {
    return handleError(err, retry, result, processId);
  }
};

export const removeExecutionFromPlanJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<RemoveExecuteFromPlanPayload>>();
  return await removeExecutionFromPlanWorker(body);
};

export const addExecutionToPlanWorker = async (
  props: ProcessJobParams<AddExecuteToPlanPayload>,
) => {
  const { processId, executionIds, planId } = props;
  const withProcess = !!processId;
  const result = getResult(processId);
  try {
    const addExecutionParams = {
      fields: {
        values: {
          [TestFiledKeyMapping.linkType]: TestLinkType.ExecutionLinkPlan,
          [TestFiledKeyMapping.linkItems]: [planId],
          [TestFiledKeyMapping.testPlans]: [planId],
        },
      },
      items: executionIds,
      asynchronous: false,
    };
    await batchUpdateItemsV2(addExecutionParams);
    const runs = await getAllEntity(
      {
        query: {
          type: TestType.Run,
          linkType: TestLinkType.RunLinkExecution,
          linkItems: [executionIds],
        },
      },
      ['id', TestFiledKeyMapping.referenceCase],
    );
    result.total = runs.length;

    const addRunToPlan = async items => {
      const runIds = [];
      const caseIds = [];

      items.forEach(i => {
        runIds.push(i.objectId);
        caseIds.push(i.referenceCase);
      });

      const updateRunParams = {
        fields: {
          values: { [TestFiledKeyMapping.plan]: planId },
        },
        items: runIds,
        asynchronous: false,
      };
      const updateCaseParams = {
        update: {
          [TestFiledKeyMapping.linkItems]: {
            concat: [planId],
          },
          [TestFiledKeyMapping.testPlans]: {
            concat: [planId],
          },
        },
        fields: {
          [TestFiledKeyMapping.linkType]: TestLinkType.CaseLinkPlan,
        },
        items: caseIds,
        asynchronous: false,
      };

      try {
        await Promise.all([
          batchUpdateItemsV2(updateRunParams),
          batchUpdateItemsV2(updateCaseParams),
        ]);
        result.success += items.length;
      } catch (e) {
        result.message.push(getErrorMessage(e));
        result.fail += items.length;
        result.items = result.items.concat(items);
        throw e;
      }
    };

    if (runs?.length) {
      if (withProcess)
        await execWithProcess({
          processId,
          execFunc: addRunToPlan,
          list: runs,
          getDesc: () => JSON.stringify(result),
          batchSize: itemsV2BatchSize,
          getBatchRecord: () => false,
        });
      else
        await batchExecFunction({
          list: runs,
          fun: addRunToPlan,
          batchSize: itemsV2BatchSize,
        });
    } else {
      await updateProcessBar(processId, 100, JSON.stringify(result));
    }

    return buildResponse(result);
  } catch (err) {
    result.message.push(getErrorMessage(err));
    withProcess && (await updateProcessBar(processId, -1, JSON.stringify(result)));
    return buildResponse(result);
  }
};

export const addExecutionToPlanJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<AddExecuteToPlanPayload>>();
  return await addExecutionToPlanWorker(body);
};

const FUNC_MAP = {
  removeCaseFromPlanWorker,
  batchDeleteItems,
  copyTesCases,
  updateItemsV2,
  createTestRuns,
};

export const retryWorker = async (props: ProcessJobParams<RetryPayload>) => {
  const { processId, retryId } = props;
  const withProcess = !!processId;
  const result = getResult(processId);
  try {
    const batchRecords = await getParseQuery(true, 'BatchHandleRecord')
      .equalTo('retryId', retryId)
      .equalTo('status', 'fail')
      .findAll({ useMasterKey: true });
    if (!batchRecords.length) return;
    const total = batchRecords.reduce((prev, record) => {
      return prev + record.get('items').length;
    }, 0);
    result.total = total;
    let index = 1;
    for (const batchRecord of batchRecords) {
      const type = batchRecord.get('type');
      const params = batchRecord.get('params');
      const items = batchRecord.get('items');
      const execFun = FUNC_MAP[type];
      params.processId = null;
      try {
        await execFun({ ...params, retry: true });
        result.success += items.length;
        await updateBatchRecordsDone([batchRecord.id]);
      } catch (err) {
        result.message.push(getErrorMessage(err));
        result.fail += items.length;
        result.items = result.items.concat(items);
        await insertBatchRecord({
          type,
          params,
          items,
          retryId: processId,
        });
      } finally {
        await updateProcessBar(
          processId,
          getProcessValue(index, batchRecords.length),
          JSON.stringify(result),
        );
        index++;
      }
    }
  } catch (err) {
    result.message.push(getErrorMessage(err));
    withProcess && (await updateProcessBar(processId, -1, JSON.stringify(result)));
    return buildResponse(result);
  }
};

export const copyFolder = async (props: ProcessJobParams<CopyFolderPayload>) => {
  const { processId, node, itemTypeKey, workspace } = props;
  const result = {
    total: 0,
    message: [],
    success: 0,
    fail: 0,
    skip: 0,
  };
  try {
    const itemType = await getParseQuery(false, 'ItemType')
      .equalTo('key', itemTypeKey)
      .select(['objectId'])
      .first({
        useMasterKey: true,
        context: {
          displayModule: 'plugin.testManager',
        },
      });

    if (!itemType) {
      console.error('case itemType not found');
      return;
    }
    const RepositoryModel = getParseModel(true, 'Repository');
    const workspaceKey = workspace.key;
    const getRepositoryObject = (node, parent) => {
      const repository = new RepositoryModel();
      repository.set('name', node.name);
      repository.set('parent', RepositoryModel.createWithoutData((parent || 'root') as string));
      repository.set('workspaceKey', workspaceKey);
      repository.set('sortIndex', node.sortIndex || generateSortIndex());
      return repository;
    };
    const handleTree = async (root, cb) => {
      if (!root) return;

      const queue = [{ node: root, parentId: root.parentKey }];

      while (queue.length > 0) {
        console.info(queue, 'copy folder handleTree');
        const { node, parentId } = queue.shift();
        const newNode = await cb(node, parentId);

        if (node.children) {
          node.children.forEach(child => queue.push({ node: child, parentId: newNode.id }));
        }
      }
    };
    const nodes = [];
    const getNode = node => {
      const newNode = {
        id: node.key,
      };
      nodes.push(newNode);
      return newNode;
    };
    await handleTree(node, getNode);
    result.total = nodes.length;

    const copySingleRepository = async (node, parentId) => {
      const repository = getRepositoryObject(node, parentId);
      const [newNode] = await saveAllObject([repository]);
      try {
        const cases = await getAllEntity(
          {
            query: {
              type: TestType.Case,
              repository: node.key,
            },
          },
          ['id'],
        );
        console.info(cases, newNode, 'copy folder copySingleRepository');
        const createCases = async cases => {
          const createParams = {
            from: cases,
            fields: {
              [TestFiledKeyMapping.repository]: newNode.id,
              [TestFiledKeyMapping.linkItems]: [],
              [TestFiledKeyMapping.linkType]: '',
              [TestFiledKeyMapping.sortIndex]: generateSortIndex(),
            },
            itemType: itemType.get('objectId'),
            workspace: workspace.objectId,
          };
          try {
            await batchCreateItemsV2(
              {
                items: createParams,
              },
              getHeaders(),
            );
          } catch (e) {
            console.error('error:', JSON.stringify(e));
            throw new Error(`${newNode.get('name')}-创建用例失败: ${e.message}`);
          } finally {
            console.info('batchCopyItem when copy folder end');
          }
        };
        await batchExecFunction({
          list: cases.map(c => c.id),
          fun: createCases,
          batchSize: 5000,
        });
        result.success += 1;
        await updateProcessBar(
          processId,
          getProcessValue(result.success + result.fail, result.total),
          JSON.stringify(result),
        );
      } catch (error) {
        result.fail += 1;
        result.message.push(error.message);
        await updateProcessBar(
          processId,
          getProcessValue(result.success + result.fail, result.total),
          JSON.stringify(result),
        );
      }
      return newNode;
    };
    await handleTree(node, copySingleRepository);

    return buildResponse(result);
  } catch (err) {
    result.message.push(err.message);
    await updateProcessBar(processId, -1, JSON.stringify(result));
    return buildResponse(result);
  }
};

export const retryJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<RetryPayload>>();
  return await retryWorker(body);
};

export const copyFolderJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<CopyFolderPayload>>();
  return await copyFolder(body);
};
