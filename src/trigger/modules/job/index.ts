import { getParseQuery } from '@giteeteam/apps-team-api';

import {
  InfinityLimit,
  SystemField,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import {
  BatchCopyTestCaseV3Payload,
  BatchCreateTestRunV2Payload,
  BatchDeletePayload,
} from '../../../common/types/api';
import { TestEntity } from '../../../common/types/test';
import { buildResponse } from '../../lib/apiUtil';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchUpdateItemsValues } from '../../lib/batchRequest';
import {
  batchCreateItemsV2,
  batchUpdateItemsV2,
  deleteItems,
  operateSnapshots,
} from '../../lib/coreApi';
import { generateSortIndex, updateProcessBar } from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';

type TestRunType = TestEntity<TestType.Run>;
type ProcessJobParams<T> = T & {
  processId?: string;
};

const {
  CREATE_V2: { batchSize: createV2BatchSize },
  DELETE_V1: { batchSize: deleteBatchSize },
} = global.env?.BATCH_CONFIG ?? {
  CREATE_V2: {
    batchSize: 100,
  },
  DELETE_V1: {
    batchSize: 100,
  },
};

const getHeaders = () => ({
  'X-Parse-Application-Id': global.applicationId,
  'X-Parse-Session-Token': global.sessionToken,
});

const batchExecFunction = async ({ list, fun, batchSize }) => {
  const step = Math.ceil(list.length / batchSize);

  for (let index = 0; index < step; index++) {
    const size = list.length > batchSize ? batchSize : list.length;
    const items = list.splice(0, size);
    const processValue = Math.ceil(((index + 1) * 100) / step);
    await fun(items, processValue);
  }
};

const execWithProcess = async ({ processId, list, execFunc, getDesc, batchSize }) => {
  const fun = async (items, processValue) => {
    try {
      await execFunc(items);
    } catch (e) {
      console.error(e.message);
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

export const createTestRuns = async ({
  execution,
  caseIds,
  workspace,
  processId,
  planId,
}: ProcessJobParams<BatchCreateTestRunV2Payload>) => {
  const result = {
    message: [],
    total: caseIds.length,
    error: 0,
    success: 0,
    skip: 0,
  };
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
    const caseSnapshotEnabled = await getCaseSnapshotEnabled();

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
      try {
        const existedReferenceCases = await getExistedTestRuns(cases);
        const existedReferenceCaseIdSet = new Set(
          existedReferenceCases.map(item => item.referenceCase),
        );
        const validatedCases = cases.filter(testCase => !existedReferenceCaseIdSet.has(testCase));
        result.skip += cases.length - validatedCases.length;
        return validatedCases;
      } catch (e) {
        result.message.push(e.message);
        result.error += cases.length;
        return [];
      } finally {
        console.info('batchCreateTestRunV2 validateCases end');
      }
    };

    // 创建测试执行
    const createRuns = async cases => {
      console.info('batchCreateTestRunV2 createRuns start');
      const createParams = {
        from: cases,
        fields: {
          [TestFiledKeyMapping.linkItems]: [execution.objectId],
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
          [TestFiledKeyMapping.sortIndex]: {
            copy: TestFiledKeyMapping.sortIndex,
          },
          [TestFiledKeyMapping.runDetail]: {
            copy: TestFiledKeyMapping.detail,
          },
        },
      };

      try {
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
            },
          },
          getHeaders(),
        );
      } catch (e) {
        result.message.push(e.message);
        result.error += cases.length;
      } finally {
        console.info('batchCreateTestRunV2 createRuns end');
      }
    };

    // 对用例打快照
    const snapshotCases = async cases => {
      let caseSnapshotMap = {};
      const {
        data: { list: caseList },
      } = await iqlRequest({
        query: {
          id: cases,
        },
        fields: [SystemField.Key],
      });

      if (caseList.length) {
        const snapshots = await operateSnapshots({
          add: {
            keys: caseList.map(i => i.key),
          },
          sourceId: execution.objectId,
          sourceType: APP_KEY,
          baseLineItemVersion: {
            name: execution.name,
          },
        });
        caseSnapshotMap = snapshots?.baselineItems?.reduce(
          (m, v) => ({ ...m, [v.itemId]: v.objectId }),
          caseSnapshotMap,
        );
      }
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
            add: [planId],
          },
        },
      };
      return await batchUpdateItemsV2(updateParams, getHeaders());
    };

    // 对用例打快照
    const planCases = async cases => {
      // 校验测试用例是否已经被规划进测试执行任务
      const needPlanCases = await validateCases(cases);
      if (!needPlanCases.length) return;

      // 创建测试执行
      await createRuns(needPlanCases);

      // 根据配置，对测试用例打快照
      await createCaseSnapshot(needPlanCases);

      // 更新测试用例上的
      await updateCaseLinkPlan(needPlanCases);
      result.success += needPlanCases.length;
    };
    if (withProcess)
      await execWithProcess({
        processId,
        execFunc: planCases,
        list: caseIds,
        getDesc: () => JSON.stringify(result),
        batchSize: createV2BatchSize,
      });
    else
      await batchExecFunction({
        list: caseIds,
        fun: planCases,
        batchSize: createV2BatchSize,
      });

    return buildResponse(result);
    // 查询测试执行任务
  } catch (err) {
    result.message.push(err.message);
    withProcess && (await updateProcessBar(processId, -1, JSON.stringify(result)));
    return buildResponse(result);
  }
};

/** 批量创建测试执行任务 */
export const createTestRunsJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<BatchCreateTestRunV2Payload>>();

  return await createTestRuns(body);
};

export const copyTesCases = async ({
  caseIds,
  itemType: itemTypeKey,
  workspace,
  repository,
  processId,
  needSuffix,
}: ProcessJobParams<BatchCopyTestCaseV3Payload>) => {
  const result = {
    total: caseIds.length,
    message: [],
    success: 0,
    error: 0,
    skip: 0,
  };
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

    const createCases = async cases => {
      const createParams = {
        from: cases,
        fields: {
          [TestFiledKeyMapping.linkItems]: [],
          [TestFiledKeyMapping.linkType]: '',
          [TestFiledKeyMapping.sortIndex]: generateSortIndex(),
        },
        update: {},
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
          },
          getHeaders(),
        );
        result.success += cases.length;
      } catch (e) {
        result.message.push(e.message);
        result.error += cases.length;
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
        batchSize: createV2BatchSize,
      });
    else
      await batchExecFunction({
        list: caseIds,
        fun: createCases,
        batchSize: createV2BatchSize,
      });

    return buildResponse(result);
  } catch (err) {
    result.message.push(err.message);
    withProcess && (await updateProcessBar(processId, -1, JSON.stringify(result)));
    return buildResponse(result);
  }
};

/** 批量复制测试用例 */
export const copyTesCasesJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<BatchCopyTestCaseV3Payload>>();
  return await copyTesCases(body);
};

export const batchDeleteItems = async ({
  ids: itemIds,
  processId,
}: ProcessJobParams<BatchDeletePayload>) => {
  const result = {
    total: itemIds.length,
    message: [],
    success: 0,
    error: 0,
    skip: 0,
  };
  const withProcess = !!processId;
  try {
    const deleteChunkItems = async items => {
      try {
        const res = await deleteItems(items, getHeaders());
        const errors = res?.filter(i => i.status !== 'success');
        result.success += items.length - errors.length;
        result.error += errors.length;
        if (errors.length) {
          result.message.push(errors[0]?.message);
        }
      } catch (e) {
        result.message.push(e.message);
        result.error += items.length;
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
      });
    else
      await batchExecFunction({
        list: items,
        fun: deleteChunkItems,
        batchSize: createV2BatchSize,
      });

    return buildResponse(result);
  } catch (err) {
    result.message.push(err.message);
    withProcess && (await updateProcessBar(processId, -1, JSON.stringify(result)));
    return buildResponse(result);
  }
};

export const batchDeleteItemsJob = async () => {
  const { body } = getReqInfoFromVMRuntime<ProcessJobParams<BatchDeletePayload>>();

  return await batchDeleteItems(body);
};
