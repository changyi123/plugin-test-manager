import { i18n } from '@giteeteam/apps-api';
import {
  addAuditLog,
  deleteParseObject,
  getParseModel,
  getParseQuery,
  requestCoreApi,
  saveAllObject,
} from '@giteeteam/apps-team-api';
import { omit } from 'lodash';
import isObject from 'lodash/isObject';

import {
  AppKey,
  BuiltinFieldNameMapping,
  BuiltInItemTypeMapping,
  FIELD_TYPE,
  InfinityLimit,
  SystemField,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import {
  AddExecuteToPlanProcessParams,
  BatchCopyTestCasePayload,
  BatchCopyTestCaseV2ProcessParams,
  BatchCopyTestCaseV3ProcessParams,
  BatchCreateTestCasePayload,
  BatchCreateTestRunPayload,
  BatchCreateTestRunV2ProcessParams,
  BatchDeleteProcessParams,
  BatchDeleteV2ProcessParams,
  BatchUpdatePayload,
  BatchUpdateProcessParams,
  BatchUpdateValuePayload,
  CopyFolderPayloadProcessParams,
  RemoveCaseFromPlanProcessParams,
  RemoveExecuteFromPlanProcessParams,
  RetryPayloadProcessParams,
} from '../../../common/types/api';
import { TestEntityLinkActionData } from '../../../common/types/common';
import { TestEntity } from '../../../common/types/test';
import { itemToTestEntity } from '../../../common/utils/dataTransfer';
import { buildResponse } from '../../lib/apiUtil';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import {
  batchCreateItems,
  batchCreateItemWithProgress,
  batchUpdateItems,
  batchUpdateItemsValues,
  updateExecutionCases,
} from '../../lib/batchRequest';
import {
  buildTestEntityLinkData,
  chunkArray,
  concatIqlRequestFields,
  execFuncWitRetry,
  generateSortIndex,
  getAllEntity,
  initProcessBar,
  toPointer,
  uuidv4,
} from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';
import { getItemCreateRequiredAttrs, getItemTypeFromKey } from '../../lib/item';
import { testEntityFieldTypeValidator, throwArgumentError } from '../../lib/validator';
import {
  addExecutionToPlanWorker,
  batchDeleteItems,
  copyFolder,
  copyTesCases,
  createTestRuns,
  removeCaseFromPlanWorker,
  removeExecutionFromPlanWorker,
  retryWorker,
  updateItemsV2,
} from '../job';
import {
  bulkUpdateItems,
  iqlSearch,
  operateSnapshots,
  queryBatchProcess,
  queryBatchResult,
  queryFields,
} from './../../lib/coreApi';

type TestCaseType = TestEntity<TestType.Case>;
type TestRunType = TestEntity<TestType.Run>;
type TestExecutionType = TestEntity<TestType.Execution>;

const batchRequestDecorator = async ({ key, asyncFunc, syncFunc }) => {
  if (key) {
    const processId = await initProcessBar(key);
    asyncFunc(processId);
    return buildResponse('success');
  } else {
    return await syncFunc();
  }
};

/** 批量创建测试用例 */
export const batchCreateTestCase = async () => {
  try {
    const {
      body: { workspaceId, data },
    } = getReqInfoFromVMRuntime<BatchCreateTestCasePayload>();

    const requiredAttrs = await getItemCreateRequiredAttrs({ objectId: workspaceId });

    const params = data.map(item => ({
      ...item,
      ...requiredAttrs,
      type: TestType.Case,
      sortIndex: generateSortIndex(),
    }));

    const res = (await batchCreateItems(params as any)) as any;
    return buildResponse(res.map(itemToTestEntity));
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量删除 */
export const batchDelete = async () => {
  try {
    const { body } = getReqInfoFromVMRuntime<BatchDeleteProcessParams>();
    const { ids, key } = body;
    if (!Array.isArray(ids)) throwArgumentError('ids', 'objectId[]');

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-batch-delete-items`,
          {
            ...body,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await batchDeleteItems(body),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量删除 */
export const batchDeleteV2 = async () => {
  try {
    const {
      body: { queryParams, key },
    } = getReqInfoFromVMRuntime<BatchDeleteV2ProcessParams>();
    const caseList = await getAllEntity(queryParams, ['id']);
    const ids = caseList.map(item => item.objectId);
    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-batch-delete-items`,
          {
            ids,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await batchDeleteItems({ ids }),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量更新事项V2接口 */
export const batchUpdateItemsV2 = async () => {
  try {
    const {
      body: { key, queryParams, items: propItems, ...params },
    } = getReqInfoFromVMRuntime<BatchUpdateProcessParams>();
    let items = propItems;
    if (queryParams) {
      items = await getAllEntity(queryParams);
    }
    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-update-items-v2`,
          {
            ...params,
            items,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await updateItemsV2(params),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

/**
 * 处理事项关联数据,删除测试执行操作
 *
 */
const getRunDataByLinkItemDelete = async data => {
  const isDeleteAction = data => 'delete' === data?.action && Array.isArray(data?.value);
  const runDataInfo = {} as any;
  data.forEach(d => {
    if (isDeleteAction(d.linkItems)) {
      runDataInfo.planIds = (runDataInfo.planIds ?? []).concat(d.linkItems.value);
      runDataInfo.caseIds = (runDataInfo.caseIds ?? []).concat(d.objectId);
    }
  });

  // 查询计划下的测试执行
  // 获取测试计划下的测试执行任务 id
  const {
    data: { list: testExecution },
  } = await iqlRequest<TestExecutionType>({
    linkQuery: {
      sourceIds: [...new Set(runDataInfo.planIds ?? [])] as string[],
      destinationType: TestType.Execution,
      linkType: TestLinkType.ExecutionLinkPlan,
    },
    fields: [SystemField.Id, TestFiledKeyMapping.referenceCase],
    pagination: { limit: InfinityLimit, offset: 0 },
  });
  const executionIds = testExecution?.map(d => d.objectId);

  // 查询测试执行任务下的符合条件的测试执行
  const {
    data: { list: runData },
  } = await iqlRequest<TestRunType>({
    query: {
      referenceCase: runDataInfo.caseIds ?? [],
      type: TestType.Run,
    },
    linkQuery: {
      sourceIds: executionIds,
      destinationType: TestType.Run,
      linkType: TestLinkType.RunLinkExecution,
    },
    fields: [SystemField.Id],
    selector: `'${BuiltinFieldNameMapping.referenceCaseSnapshot}' is null`,
    pagination: { limit: InfinityLimit, offset: 0 },
  });

  const runIds = runData?.map(d => d.objectId);
  return {
    runIds,
    executionIds,
  };
};

/** 批量更新 */
export const batchUpdate = async () => {
  const {
    //@todo 待core支持事项批量更新接口
    body: { data, onlyValues = true, isChangeStatus = false },
  } = getReqInfoFromVMRuntime<BatchUpdatePayload>();
  if (!Array.isArray(data)) throwArgumentError('data', 'testEntity[]');

  // 需要更新的事项
  const needUpdateItemData = await buildTestEntityLinkData(data as TestEntityLinkActionData[]);

  console.info('---needUpdateItemData', JSON.stringify(needUpdateItemData));
  // 校验需要保存的参数
  needUpdateItemData.forEach(testEntityFieldTypeValidator);
  const tasks = [
    onlyValues
      ? batchUpdateItemsValues(needUpdateItemData, isChangeStatus)
      : batchUpdateItems(needUpdateItemData),
  ];

  // 移除测试计划下的测试用例关联的测试执行
  const { runIds: needDeleteTestRunIds, executionIds } = await getRunDataByLinkItemDelete(data);
  if (needDeleteTestRunIds?.length) {
    tasks.push(batchDeleteItems({ ids: needDeleteTestRunIds }));
  }

  const [res] = await Promise.all(tasks);
  // 删除测试执行后，更新测试执行任务引用的引用数
  if (executionIds?.length) {
    await updateExecutionCases(executionIds);
  }

  return buildResponse(res.filter(Boolean).map(data => itemToTestEntity(data.item)));
};

/** 批量更新 固定值 */
export const batchUpdateValue = async () => {
  try {
    const {
      body: { queryParams, value },
    } = getReqInfoFromVMRuntime<BatchUpdateValuePayload>();
    if (!value) throwArgumentError('data', 'testEntity[]');
    const caseIds = await getAllEntity(queryParams);
    const data = caseIds.map(objectId => ({
      objectId,
      ...value,
    }));

    // 需要更新的事项
    const needUpdateItemData = await buildTestEntityLinkData(data as TestEntityLinkActionData[]);
    // 校验需要保存的参数
    needUpdateItemData.forEach(testEntityFieldTypeValidator);
    const tasks = [batchUpdateItemsValues(needUpdateItemData)];

    const [res] = await Promise.all(tasks);
    const responseResult = buildResponse(
      res.filter(Boolean).map(data => itemToTestEntity(data.item)),
    );
    if (responseResult.status === 'ok') {
      const workspaceQuery = await getParseQuery(false, 'Workspace');
      const workspaceName = await workspaceQuery
        .equalTo('key', queryParams.query.workspaceKey)
        .first({ sessionToken })
        .then(item => item.get('name'));
      const extraAttributes = [
        {
          name: i18n.t('trigger.modules.api.batch.caseName'),
          value: responseResult?.data.map(i => `${i.name}(${i.key})`).join(', '),
        },
        {
          name: i18n.t('trigger.modules.api.batch.numberItems'),
          value: `${responseResult?.data.length || 0}`,
        },
        {
          name: i18n.t('trigger.modules.api.batch.setCharge'),
          value: value.values.assignee.map(i => i.label).join(', '),
        },
      ];
      if (queryParams?.selectAll) {
        extraAttributes.push({
          name: i18n.t('trigger.modules.api.batch.operate'),
          value: i18n.t('trigger.modules.api.batch.selectAll'),
        });
        extraAttributes.push({
          name: i18n.t('trigger.modules.api.batch.modulePath'),
          value: `${queryParams?.breadcrumbs.join(' > ')}`,
        });
      }
      addAuditLog({
        action: 'plungin_test_respository_batch_assignee.action',
        extraAttributes,
        resources: [
          {
            type: 'nullRoute',
            id: '',
            name: `${workspaceName}-${i18n.t('trigger.modules.api.batch.testCases')}`,
          },
        ],
      });
    }
    return responseResult;
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量创建测试执行任务 */
export const batchCreateTestRun = async () => {
  try {
    const { body } = getReqInfoFromVMRuntime<BatchCreateTestRunPayload>();
    const { case: _case, withProcess = true, executionId } = body;

    if (!Array.isArray(_case)) throwArgumentError('case', 'object[]');
    const caseIds = _case.map(i => i.caseId);
    const needCaseList = await getNeedPlanCaseList(caseIds, executionId);

    const BatchLog = getParseModel(true, 'BatchLog');
    const log = new BatchLog();
    log.set('count', needCaseList.length);
    log.set('type', 'bulk-create-item');
    log.set('logIds', []);
    const [batchLog] = await saveAllObject([log]);
    const createTestRuns = () =>
      requestCoreApi(
        'POST',
        `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/api-batch-create-test-run-job`,
        {
          ...body,
          withProcess: true,
          batchLogId: batchLog.id,
        },
        headers,
      );
    if (withProcess) {
      createTestRuns();
    } else {
      await createTestRuns();
    }

    return {
      batchId: batchLog.id, // 批次id
      type: 'bulk-create-item', // 类型
      status: 'running', // 批次状态： running | finished | timeout
      count: needCaseList.length, // 批量创建的事项数
    };
  } catch (err) {
    return buildResponse(err);
  }
};

const getNeedPlanCaseList = async (caseIds, executionId) => {
  // 获取所有测试用例数据
  const getTestCaseByCaseIds = async () => {
    const {
      data: { list: caseList },
    } = await iqlRequest<TestCaseType>({
      query: {
        id: caseIds,
      },
      pagination: { limit: InfinityLimit },
      fields: [
        SystemField.Id,
        SystemField.Key,
        SystemField.Name,
        SystemField.ItemGroup,
        SystemField.Workspace,
        TestFiledKeyMapping.detail,
        TestFiledKeyMapping.sortIndex,
        TestFiledKeyMapping.caseStatus,
        TestFiledKeyMapping.caseExecutor,
      ],
    });
    return caseList;
  };

  // 获取测试管理已关联的测试执行 CaseIds
  const getExistedTestRunReferenceCaseIdSet = async () => {
    const {
      data: { list: existedReferenceCaseIds },
    } = await iqlRequest<TestRunType>({
      query: {
        referenceCase: caseIds,
      },
      pagination: { limit: InfinityLimit },
      linkQuery: {
        sourceIds: executionId,
        destinationType: TestType.Run,
        linkType: TestLinkType.RunLinkExecution,
      },
      fields: [TestFiledKeyMapping.referenceCase],
    });

    return new Set(existedReferenceCaseIds.map(item => item.referenceCase));
  };

  const [caseList, existedReferenceCaseIdSet] = await Promise.all([
    getTestCaseByCaseIds(),
    getExistedTestRunReferenceCaseIdSet(),
  ]);

  const needCaseList = caseList
    // 过滤已规划的测试用例
    .filter(testCase => !existedReferenceCaseIdSet.has(testCase.objectId));
  return needCaseList;
};

const sendNotification = async (notificationUrl, data) => {
  let retryCount = 0;
  if (!notificationUrl) return;
  const send = async () => {
    await axios({ url: notificationUrl, data, method: 'POST' })
      .then(result => {
        if (result.status === 200) {
          console.info('[batchOperation] send notification success', result.data);
        } else {
          console.error(
            '[batchOperation] send notification failed with status code',
            result.status,
          );
          retryCount++;
        }
      })
      .catch(e => {
        console.error('[batchOperation] send notification error', e.message);
        retryCount++;
      });
  };
  await execFuncWitRetry({
    func: send,
    label: 'send notification',
    validate: () => retryCount > 3,
  });
};

/** 批量创建测试执行Job */
export const batchCreateTestRunJob = async () => {
  try {
    const {
      body: { executionId, case: _case, batchLogId, notificationUrl },
    } = getReqInfoFromVMRuntime<BatchCreateTestRunPayload>();
    const APP_KEY = global.appKey ?? 'test_manager';

    if (!Array.isArray(_case)) throwArgumentError('case', 'object[]');
    const caseIds = _case.map(i => i.caseId);

    // 获取测试执行任务 testExecution
    const getExecution = async () => {
      const {
        data: {
          list: [testPlan],
        },
      } = await iqlRequest({
        query: {
          id: [executionId],
        },
        fields: [SystemField.Name],
      });

      return testPlan;
    };

    const getItemType = async () => {
      const [{ objectId: runItemTypeId }] = await getItemTypeFromKey([
        BuiltInItemTypeMapping.TestRun,
      ]);
      return {
        __type: 'Pointer',
        className: 'ItemType',
        objectId: runItemTypeId,
      };
    };

    // 获取测试执行任务关联的 testPlan
    const getExecutionLinkedTestPlan = async () => {
      const {
        data: {
          list: [testPlan],
        },
      } = await iqlRequest({
        query: {
          id: [executionId],
        },
        linkQuery: {
          linkType: TestLinkType.ExecutionLinkPlan,
          destinationType: TestType.Plan,
          sourceIds: [executionId],
        },
        fields: [SystemField.Id],
      });

      return testPlan;
    };

    const [testExecution, testPlan, itemType] = await Promise.all([
      getExecution(),
      getExecutionLinkedTestPlan(),
      getItemType(),
    ]);

    // 创建测试用例快照
    // 1. 获取用例所属空间是否支持规划时批量快照
    // 2. 创建测试用例快照
    const batchCreateCaseSnapshot = async needCaseList => {
      let caseSnapshotMap = {};
      if (!global.env?.ENABLED_CASE_SNAPSHOT && !global.env?.DEFAULT_ENABLED_CASE_SNAPSHOT)
        return caseSnapshotMap;
      const workspaceKeys = needCaseList.reduce((keys, i) => {
        const workspaceKey = i?.workspace?.key;
        if (workspaceKey && !keys.includes(workspaceKey)) {
          keys.push(workspaceKey);
        }
        return keys;
      }, []);
      const workspaceConfigs = await getParseQuery(false, 'test_manager_TestConfig')
        .containedIn('workspaceKey', workspaceKeys)
        .select(['workspaceKey', 'enableCaseSnapshot'])
        .findAll({ useMasterKey: true })
        .then(data =>
          data?.reduce((m, i) => {
            return {
              ...m,
              [i.get('workspaceKey')]: global.env?.ENABLED_CASE_SNAPSHOT
                ? i.get('enableCaseSnapshot')
                : global.env?.DEFAULT_ENABLED_CASE_SNAPSHOT,
            };
          }, {}),
        );

      const caseSnapshots = needCaseList.filter(i => workspaceConfigs[i.workspace?.key]);
      if (caseSnapshots.length) {
        const snapshots = await operateSnapshots({
          add: {
            keys: caseSnapshots.map(i => i.key),
          },
          sourceId: executionId,
          sourceType: APP_KEY,
          baseLineItemVersion: {
            name: testExecution.name,
          },
        });
        caseSnapshotMap = snapshots?.baselineItems?.reduce(
          (m, v) => ({ ...m, [v.itemId]: v.objectId }),
          caseSnapshotMap,
        );
      }
      return caseSnapshotMap;
    };

    // 初始的任务 key
    const StartStatusKey = 'TODO';
    // 创建测试执行
    // 1. 查所有测试用例
    // 2. 创建测试执行
    // 3. 过滤已规划的测试用例
    const generateCreateRuns = (caseSnapshotMap, needCaseList) => {
      return (
        // 过滤已规划的测试用例
        needCaseList
          // 生成需要创建的测试执行属性
          .map(data => {
            // 关联数据，测试执行关联测试执行任务
            const linkData = executionId
              ? {
                  linkType: TestLinkType.RunLinkExecution,
                  linkItems: [executionId],
                  plan: testPlan.objectId,
                }
              : null;
            const params = _case.find(i => i.caseId === data.objectId);

            return {
              ...linkData,
              type: TestType.Run,
              // 修改测试执行详情数据在创建时确定
              runDetail: data.detail,
              // runDetail: {},
              // 空间和测试用例的空间保持一致
              workspace: {
                __type: 'Pointer',
                className: 'Workspace',
                objectId: data.workspace.objectId,
              },
              // 测试执行的 sortIndex 和 测试用例的保持一致
              sortIndex: data.sortIndex,
              // 事项类型使用内置的事项类型（不可变）
              itemType,
              // // 事项组
              itemGroup: (data as any).itemGroup,
              // 初始化状态为 TODO
              status: StartStatusKey,
              name: data.name,
              referenceCase: data.objectId,
              referenceCaseSnapshot: caseSnapshotMap[data.objectId],
              createdBy: data.createdBy,
              ...omit(params, ['caseId']),
            };
          })
      );
    };

    const createTestRuns = async caseList => {
      const caseSnapshotMap = await batchCreateCaseSnapshot(caseList);
      const testRuns = generateCreateRuns(caseSnapshotMap, caseList);
      const batchResult = await batchCreateItemWithProgress(testRuns, null, null, false);
      console.info(batchResult, 'createTestRuns-batchCreateItemWithProgress');
      // 更新batchLog
      if (batchLogId) {
        const { batchId } = batchResult;
        if (!batchId) return;
        const batchLog = await getParseQuery(true, 'BatchLog')
          .equalTo('objectId', batchLogId)
          .first({ useMasterKey: true });
        const logIds = batchLog.get('logIds') || [];
        logIds.push(batchId);
        const BatchModel = getParseModel(true, 'BatchLog');
        const batchLogObject = BatchModel.createWithoutData(batchLogId);
        batchLogObject.set('logIds', logIds);
        await saveAllObject([batchLogObject]);
      }
    };

    // 分批执行
    const chunkCaseList = chunkArray(caseIds, 100);
    for (const caseIds of chunkCaseList) {
      console.info('createTestRuns', caseIds);
      const caseList = await getNeedPlanCaseList(caseIds, executionId);
      console.info('getNeedPlanCaseList', caseList);
      await createTestRuns(caseList);
    }

    const response = await getBatchResultFunction(batchLogId, true);
    await sendNotification(notificationUrl, response);
    return response;
    // 查询测试执行任务
  } catch (err) {
    console.info(err, 'error');
    return buildResponse(err);
  }
};

function getBasicResult(batchLog) {
  return {
    batchId: batchLog.get('objectId'), // 生成新的合并批次ID
    type: batchLog.get('type'), // 类型将取自第一个批次
    count: batchLog.get('count'), // 总事项数
    success: 0, // 总成功数
    fail: 0, // 总失败数
    items: [], // 所有成功事项
    failItems: [], // 所有失败事项
  };
}

function mergeBatchResults(mergedResult, batchResults) {
  // 遍历每个批次结果进行合并
  batchResults.forEach((batch, index) => {
    if (index === 0) {
      mergedResult.type = batch.type; // 使用第一个批次的类型
      mergedResult.startTime = batch.startTime; // 使用第一个批次的类型
    }

    // 累加计数
    mergedResult.success += batch.success || 0;
    mergedResult.fail += batch.fail || 0;

    // 合并成功事项
    if (batch.items && Array.isArray(batch.items)) {
      mergedResult.items = mergedResult.items.concat(batch.items);
    }

    // 合并失败事项
    if (batch.failItems && Array.isArray(batch.failItems)) {
      mergedResult.failItems = mergedResult.failItems.concat(batch.failItems);
    }
    mergedResult.status = batch.status;
    mergedResult.finishedTime = batch.finishedTime;
  });

  return mergedResult;
}

async function getBatchResultFunction(batchId, withResult) {
  const batchLog = await getParseQuery(true, 'BatchLog')
    .equalTo('objectId', batchId)
    .first({ useMasterKey: true });
  // 初始化合并结果对象
  const mergedResult = getBasicResult(batchLog);
  const logs = batchLog.get('logIds');
  const getLogResult = async logId => {
    let result;
    if (withResult) {
      result = await queryBatchResult(logId);
    } else {
      result = await queryBatchProcess(logId);
    }
    return result;
  };
  const results = await Promise.all(logs.map(getLogResult));
  return mergeBatchResults(mergedResult, results);
}

/** 获取测试管理批量操作的进度条 */
export const getBatchResult = async () => {
  try {
    const { body } = getReqInfoFromVMRuntime<{ batchId: string; withResult: boolean }>();
    const { batchId, withResult } = body;

    if (!batchId) throwArgumentError('batchId', 'objectId');
    const response = await getBatchResultFunction(batchId, withResult);

    return response;
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量创建测试执行任务 */
export const batchCreateTestRunV2 = async () => {
  try {
    const { body, headers } = getReqInfoFromVMRuntime<BatchCreateTestRunV2ProcessParams>();
    const { execution, caseIds, workspace, key } = body;

    if (!Array.isArray(caseIds)) throwArgumentError('caseIds', 'objectId[]');
    if (!execution) throwArgumentError('execution', '{ objectId: string, name: string }');
    if (!workspace || !workspace?.objectId || !workspace.key)
      throwArgumentError('workspace', '{ objectId: string, key: string }');

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-create-test-run`,
          {
            ...body,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await createTestRuns(body),
    });
    // 查询测试执行任务
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量复制测试用例 */
export const batchCopyTestCase = async () => {
  try {
    const {
      body: { caseIds, fields, workspaceKey, repository },
      sessionToken,
    } = getReqInfoFromVMRuntime<BatchCopyTestCasePayload>();
    const copyName = i18n.t('trigger.copyName');

    // 如果workspaceId存在，则批量创建在该空间下
    let newWorkspace = null;

    if (workspaceKey) {
      const workspaceObj = await getParseQuery(false, 'Workspace')
        .equalTo('key', workspaceKey)
        .first({ sessionToken });
      if (!workspaceObj) {
        throw new Error(i18n.t('components.business.testManagerProvider.notCreateCase'));
      }
      newWorkspace = workspaceObj.toJSON();
    }

    // 查询字段，确认字段类型
    const { payload: results = [] } = await queryFields({
      keys: fields,
      fieldType: true,
    });
    const objectToIdFieldKeys = results
      .filter(item =>
        [
          FIELD_TYPE.SPRINT,
          FIELD_TYPE.VERSION,
          FIELD_TYPE.CUSTOM_VERSION,
          FIELD_TYPE.BINDWORKSPACE,
          FIELD_TYPE.TEAM,
        ].includes(item.fieldType.key),
      )
      .map(item => item.key);

    const {
      data: { list: caseList },
    } = await iqlRequest<TestCaseType>({
      query: {
        id: caseIds,
      },
      pagination: { limit: InfinityLimit },
      fields: concatIqlRequestFields(fields),
    });

    if (!caseList?.length) {
      throw new Error(i18n.t('components.business.testEntitySelectorModal.itemDeleted'));
    }

    // 优先级字段异常容错处理
    const dataValuesExceptionHandler = values => {
      const handleObjectToId = (key: string, id: string) => {
        const getObjectKey = value => {
          console.info('value', value?.[id], value);
          if (isObject(value) && Object.hasOwnProperty.call(value, id)) {
            return value?.[id];
          }
          return value;
        };
        if (Array.isArray(values[key])) {
          values[key] = values[key].map(getObjectKey).filter(Boolean);
        } else {
          values[key] = getObjectKey(values[key]);
        }
      };
      // 对象结构为异常的数据结构，需要进行容错处理
      // 优先级字段异常容错处理
      handleObjectToId('priority', 'key');
      // 版本、迭代和自定义版本异常处理
      objectToIdFieldKeys.forEach(fieldKey => handleObjectToId(fieldKey, 'objectId'));

      return values;
    };

    const needCreateItems = caseList.map((data, index) => ({
      name: workspaceKey ? data.name : `${data.name}_${copyName}`,
      type: data.type,
      sortIndex: generateSortIndex(index),
      workspace: workspaceKey ? newWorkspace : data.workspace,
      itemType: data.itemType,
      values: dataValuesExceptionHandler(data.values),
      detail: data.detail
        ? {
            ...data.detail,
            steps: data.detail?.steps?.map(s => ({
              ...s,
              id: uuidv4(),
            })),
          }
        : {},
      repository: repository === undefined ? data.repository : repository,
    }));

    const copyItems = await batchCreateItems(needCreateItems as any, fields);
    return buildResponse(copyItems);
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量复制测试用例 V2 */
export const batchCopyTestCaseV2 = async () => {
  try {
    const { body, headers } = getReqInfoFromVMRuntime<BatchCopyTestCaseV2ProcessParams>();
    const { queryParams, key } = body;
    if (!queryParams) throwArgumentError('queryParams', '{ query, selector }');

    const caseList = await getAllEntity(queryParams, [SystemField.Id]);

    if (!caseList?.length) {
      throw new Error(i18n.t('components.business.testEntitySelectorModal.itemDeleted'));
    }
    const caseIds = caseList.map(i => i.id);

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-copy-test-case`,
          {
            ...body,
            caseIds,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await copyTesCases({ ...body, caseIds }),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量复制测试用例 V3 */
export const batchCopyTestCaseV3 = async () => {
  try {
    const { body, headers } = getReqInfoFromVMRuntime<BatchCopyTestCaseV3ProcessParams>();
    const { caseIds, itemType, workspace, key } = body;
    // const copyName = i18n.t('trigger.copyName');
    if (!caseIds) throwArgumentError('caseIds', 'string[]');
    if (!itemType) throwArgumentError('itemType', 'string');
    if (!workspace) throwArgumentError('workspace', '{ objectId: string; key: string }');

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-copy-test-case`,
          {
            ...body,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await copyTesCases(body),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

/** 从测试计划移除测试用例 */
export const removeCaseFromPlan = async () => {
  try {
    const { body, headers } = getReqInfoFromVMRuntime<RemoveCaseFromPlanProcessParams>();
    const { caseIds, planId, key } = body;
    if (!Array.isArray(caseIds) || !caseIds.length) throwArgumentError('caseIds', 'string[]');
    if (!planId) throwArgumentError('planId', 'string');

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-remove-case-from-plan`,
          {
            ...body,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await removeCaseFromPlanWorker(body),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

/** 从测试计划移除测试执行任务 */
export const removeExecutionFromPlan = async () => {
  try {
    const { body, headers } = getReqInfoFromVMRuntime<RemoveExecuteFromPlanProcessParams>();
    const { executionIds, planId, key } = body;

    if (!Array.isArray(executionIds) || !executionIds.length)
      throwArgumentError('executionIds', 'string[]');
    if (!planId) throwArgumentError('planId', 'string');

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-remove-execution-from-plan`,
          {
            ...body,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await removeExecutionFromPlanWorker(body),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

/** 添加测试执行任务到测试计划 */
export const addExecutionToPlan = async () => {
  try {
    const { body, headers } = getReqInfoFromVMRuntime<AddExecuteToPlanProcessParams>();
    const { planId, executionIds, key } = body;
    // const copyName = i18n.t('trigger.copyName');
    if (!planId) throwArgumentError('testPlanId', 'string');
    if (!Array.isArray(executionIds) || !executionIds.length)
      throwArgumentError('executionIds', 'string[]');

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-add-execution-to-plan`,
          {
            ...body,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await addExecutionToPlanWorker(body),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

const getItemLinkType = async () => {
  const ParseBaseQueryOptions = { useMasterKey: true };
  const globalTestConfig = await getParseQuery(true, 'TestConfig')
    .equalTo('global', true)
    .select(['extra'])
    .first(ParseBaseQueryOptions);
  if (!globalTestConfig) throw new Error('未找到对应关联类型');
  const itemLinkType = globalTestConfig.get('extra')?.itemLinkTypeMapping?.TestToDefect;
  if (!itemLinkType) throw new Error('未找到对应关联类型');
  return itemLinkType;
};

const getLinkItems = async ({ caseId, executionId, defectItemIds }) => {
  const linkItems = [...defectItemIds, caseId, executionId];
  const {
    payload: { items },
  } = await iqlSearch({
    iql: `(test_manager_referenceCase = '${caseId}' and test_manager_linkItems in ['${executionId}']) or id in ${JSON.stringify(
      linkItems,
    )}`,
    fields: ['id', 'itemType', TestFiledKeyMapping.runDetail, TestFiledKeyMapping.type],
    displayContext: AppKey,
    size: linkItems.length + 1,
  });

  const bugIds = [];
  let caseItem = null;
  let execution = null;
  let run = null;

  console.info('batchLinkBugsToRun query result', items);
  items.forEach(item => {
    const typeKey = item.values?.[TestFiledKeyMapping.type];
    switch (typeKey) {
      case TestType.Run:
        run = item;
        break;
      case TestType.Case:
        caseItem = item;
        break;
      case TestType.Execution:
        execution = item;
        break;
      default:
        bugIds.push(item.id);
    }
  });
  console.info('batchLinkBugsToRun run and bug', bugIds, run);

  if (!bugIds.length) throw new Error('对应缺陷未找到');
  if (!run) throw new Error('测试用例尚未规划进执行任务');
  if (!execution) throw new Error('测试执行任务未找到');

  return {
    run,
    caseItem,
    execution,
    bugIds,
  };
};

const getLinkedBugs = async ({ bugIds, runId, caseId, executionId, itemLinkType }) => {
  const existedItemLinks = await getParseQuery(false, 'ItemLink')
    .equalTo('linkType', itemLinkType)
    .containedIn('destination', bugIds)
    .findAll({ useMasterKey: true });
  console.info('batchLinkBugsToRun existedItemLinks', existedItemLinks);

  const runLinkedBugs = [];
  const executionLinkedBugs = [];
  const caseLinkedBugs = [];
  const otherLinks = [];
  const existedLinksMap = new Map();

  existedItemLinks.forEach(link => {
    const sourceId = link.get('source').objectId;
    const bugId = link.get('destination').objectId;
    if (existedLinksMap.get(sourceId)) {
      existedLinksMap.get(sourceId).push({ id: link.id, bug: bugId });
    } else {
      existedLinksMap.set(sourceId, [{ id: link.id, bug: bugId }]);
    }

    switch (sourceId) {
      case runId:
        runLinkedBugs.push(bugId);
        break;
      case caseId:
        caseLinkedBugs.push(bugId);
        break;
      case executionId:
        executionLinkedBugs.push(bugId);
        break;
      default:
        otherLinks.push({ bug: bugId, source: sourceId });
    }
  });
  console.info(
    'batchLinkBugsToRun runLinkedBugs executionLinkedBugs',
    runLinkedBugs,
    existedItemLinks,
  );

  return {
    existedLinksMap,
    otherLinks,
    runLinkedBugs,
    executionLinkedBugs,
    caseLinkedBugs,
  };
};

const getHandleItemLinkParams = async ({ caseId, executionId, defectItemIds }) => {
  const { run, bugIds } = await getLinkItems({
    caseId,
    executionId,
    defectItemIds,
  });
  const itemLinkType = await getItemLinkType();
  const linkedBugs = await getLinkedBugs({
    caseId,
    executionId,
    runId: run.id,
    bugIds,
    itemLinkType,
  });

  return {
    run,
    linkItemIds: { caseId, executionId, bugIds, runId: run.id },
    itemLinkType,
    linkedBugs,
  };
};

const addItemLinks = async ({
  itemLinkType,
  linkItemIds: { bugIds, runId, executionId, caseId },
  linkedBugs: { runLinkedBugs, executionLinkedBugs, caseLinkedBugs },
}) => {
  const bugLinks = [];
  const ItemLink = getParseModel(false, 'ItemLink');

  bugIds
    .filter(bug => !runLinkedBugs.includes(bug))
    .forEach(bug => {
      const link = new ItemLink();
      link.set('source', toPointer('Item', runId));
      link.set('destination', toPointer('Item', bug));
      link.set('linkType', toPointer('ItemLinkType', itemLinkType));
      bugLinks.push(link);
    });

  bugIds
    .filter(bug => !executionLinkedBugs.includes(bug))
    .forEach(bug => {
      const link = new ItemLink();
      link.set('source', toPointer('Item', executionId));
      link.set('destination', toPointer('Item', bug));
      link.set('linkType', toPointer('ItemLinkType', itemLinkType));
      bugLinks.push(link);
    });
  caseId &&
    bugIds
      .filter(bug => !caseLinkedBugs.includes(bug))
      .forEach(bug => {
        const link = new ItemLink();
        link.set('source', toPointer('Item', caseId));
        link.set('destination', toPointer('Item', bug));
        link.set('linkType', toPointer('ItemLinkType', itemLinkType));
        bugLinks.push(link);
      });

  console.info('batchLinkBugsToRun bugLinks', bugLinks.length);
  await saveAllObject(bugLinks);
};

// 获取引用了测试用例的测试执行
const getCaseRuns = async caseId => {
  const {
    data: { list: runList },
  } = await iqlRequest<TestRunType>({
    query: {
      referenceCase: [caseId],
      type: TestType.Run,
    },
    pagination: { limit: InfinityLimit },
    fields: [SystemField.Id, TestFiledKeyMapping.runDetail, TestFiledKeyMapping.referenceCase],
  });

  return runList || [];
};

// 更新测试用例的测试缺陷字段
const updateCaseDefects = async caseIds => {
  if (!caseIds?.length) {
    console.info('updateCaseDefects  caseIds is null', JSON.stringify(caseIds));
    return;
  }

  const getDefectItemIds = runList => {
    const runDetails = runList?.map(d => d?.runDetail).filter(Boolean) ?? [];

    const stepDefectIds = runDetails
      .filter(d => d?.steps)
      .map(d => d.steps)
      .flat()
      .map(d => d.defectItemIds ?? [])
      .flat();

    const runDefectItemIds = runDetails.map(d => d?.defectItemIds ?? []).flat();
    return [...new Set([...stepDefectIds, ...runDefectItemIds])].filter(Boolean);
  };

  const runList = await getCaseRuns(caseIds);

  console.info('updateCaseDefects case runs', JSON.stringify(runList));

  const caseRunMap = runList.reduce((result, run) => {
    const caseId = run.referenceCase;
    if (caseId) {
      if (!result[caseId]) {
        result[caseId] = [];
      }
      result[caseId].push(run);
    }
    return result;
  }, {});

  const updates = Object.keys(caseRunMap).map(caseId => {
    const runs = caseRunMap[caseId];
    const defectItemIds = getDefectItemIds(runs);
    return {
      itemIds: [caseId],
      customField: TestFiledKeyMapping.testDefects,
      value: defectItemIds,
    };
  });

  console.info('updateCaseDefects updates', JSON.stringify(updates));

  if (!updates.length) {
    return;
  }

  await bulkUpdateItems({
    updates,
  });
};

// 关联执行和缺陷
export const batchLinkBugsToRun = async () => {
  const {
    body: { caseId, executionId, defectItemIds, stepId },
  } = getReqInfoFromVMRuntime<{
    caseId: string;
    executionId: string;
    defectItemIds: string[];
    stepId?: string;
  }>();
  try {
    if (!Array.isArray(defectItemIds)) throwArgumentError('defectItemIds', 'objectId[]');
    if (defectItemIds.length > 100) throwArgumentError('defectItemIds', '关联缺陷最多100条');
    if (!caseId) throwArgumentError('caseId', 'objectId');
    if (!executionId) throwArgumentError('executionId', 'objectId');

    const handleItemLinkParams = await getHandleItemLinkParams({
      caseId,
      defectItemIds,
      executionId,
    });
    await addItemLinks(handleItemLinkParams);

    const run = handleItemLinkParams?.run;
    let runDetail = {} as any;
    try {
      runDetail = JSON.parse(run.values?.[TestFiledKeyMapping.runDetail] || '{}');
    } catch (e) {
      console.error(`JSON parse runDetail error, ->`, runDetail, e.message);
    }

    const getDefectItemIds = (currentDefectItemIds = []) => [
      ...new Set(currentDefectItemIds.concat(defectItemIds)),
    ];
    if (stepId) {
      runDetail?.steps?.forEach(step => {
        if (step.id === stepId) step.defectItemIds = getDefectItemIds(step.defectItemIds);
      });
    } else {
      runDetail = {
        ...runDetail,
        defectItemIds: getDefectItemIds(runDetail.defectItemIds),
      };
    }
    await bulkUpdateItems({
      updates: [
        {
          itemIds: [run.id],
          customField: TestFiledKeyMapping.runDetail,
          value: JSON.stringify(runDetail),
        },
      ],
    });

    await updateCaseDefects([caseId]);

    return buildResponse(defectItemIds);
  } catch (error) {
    return buildResponse(error);
  }
};

// 移除执行和缺陷的关联
export const batchRemoveBugsWithRun = async () => {
  const {
    body: { caseId, executionId, defectItemIds, stepId },
  } = getReqInfoFromVMRuntime<{
    caseId: string;
    executionId: string;
    defectItemIds: string[];
    stepId?: string;
  }>();

  try {
    if (!Array.isArray(defectItemIds)) throwArgumentError('defectItemIds', 'objectId[]');
    if (!caseId) throwArgumentError('caseId', 'objectId');
    if (!executionId) throwArgumentError('executionId', 'objectId');

    const {
      run,
      linkedBugs: { existedLinksMap, otherLinks },
    } = await getHandleItemLinkParams({
      caseId,
      executionId,
      defectItemIds,
    });

    let deleteLinks = [
      ...(existedLinksMap.get(caseId) || []).map(link => link.id),
      ...(existedLinksMap.get(run.id) || []).map(link => link.id),
    ];

    // 如果同一用例重复规划进测试执行任务，只有在所有用例的执行都不关联该缺陷时，才删除执行任务和缺陷的关联
    const otherLinkedItemIds = otherLinks.map(link => link.source);
    if (otherLinkedItemIds.length) {
      const {
        payload: { items },
      } = await iqlSearch({
        iql: `id in ${JSON.stringify(
          otherLinkedItemIds,
        )} and test_manager_linkItems in ['${executionId}'] and test_manager_type = 'TestRun'`,
        fields: ['id'],
        displayContext: AppKey,
        size: 9999,
      });
      if (items.length) {
        const otherRunLinkedBugs = items.flatMap(i =>
          (existedLinksMap.get(i.id) || []).map(link => link.bug),
        );
        const executionLinks = existedLinksMap.get(executionId) || [];
        const needDeleteLinks = executionLinks.reduce((links, link) => {
          if (!otherRunLinkedBugs.includes(link.bug) && !links.includes(link.id)) {
            links.push(link.id);
          }
          return links;
        }, []);
        deleteLinks = deleteLinks.concat(needDeleteLinks);
      } else {
        deleteLinks = deleteLinks.concat([
          ...(existedLinksMap.get(executionId) || []).map(link => link.id),
        ]);
      }
    } else {
      deleteLinks = deleteLinks.concat([
        ...(existedLinksMap.get(executionId) || []).map(link => link.id),
      ]);
    }

    const ItemLink = getParseModel(false, 'ItemLink');
    deleteLinks.filter(Boolean).forEach(async link => {
      await deleteParseObject(ItemLink.createWithoutData(link));
    });

    let runDetail = {} as any;
    try {
      runDetail = JSON.parse(run.values?.[TestFiledKeyMapping.runDetail] || '{}');
    } catch (e) {
      console.error(`JSON parse runDetail error, ->`, runDetail, e.message);
      return;
    }
    const getDefectItemIds = (currentDefectItemIds = []) => [
      ...new Set(currentDefectItemIds.filter(id => !defectItemIds.includes(id))),
    ];
    if (stepId) {
      runDetail?.steps?.forEach(step => {
        if (step.id === stepId) step.defectItemIds = getDefectItemIds(step.defectItemIds);
      });
    } else {
      runDetail = {
        ...runDetail,
        defectItemIds: getDefectItemIds(runDetail.defectItemIds),
      };
    }

    await bulkUpdateItems({
      updates: [
        {
          itemIds: [run.id],
          customField: TestFiledKeyMapping.runDetail,
          value: JSON.stringify(runDetail),
        },
      ],
    });

    await updateCaseDefects([caseId]);

    return buildResponse(defectItemIds);
  } catch (error) {
    return buildResponse(error);
  }
};

/** 添加测试执行任务到测试计划 */
export const retry = async () => {
  try {
    const { body, headers } = getReqInfoFromVMRuntime<RetryPayloadProcessParams>();
    const { key } = body;

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-retry`,
          {
            ...body,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await retryWorker(body),
    });
  } catch (err) {
    return buildResponse(err);
  }
};
/** 复制模块 */
export const batchCopyFolder = async () => {
  try {
    const { body, headers } = getReqInfoFromVMRuntime<CopyFolderPayloadProcessParams>();
    const { key } = body;

    return await batchRequestDecorator({
      key,
      asyncFunc: processId =>
        requestCoreApi(
          'POST',
          `/api/app/${global.env.TENANT_KEY}/${global.appKey}/webhooks/job-copy-folder`,
          {
            ...body,
            processId,
          },
          headers,
        ),
      syncFunc: async () => await copyFolder(body),
    });
  } catch (err) {
    return buildResponse(err);
  }
};

// 批量更新测试执行任务规划的用例数
export const batchUpdateExecutionCases = async () => {
  const {
    body: { executionIds },
  } = getReqInfoFromVMRuntime<{
    executionIds: string[];
  }>();

  return updateExecutionCases(executionIds);
};

// 全量更新测试执行任务规划的用例数
export const updateAllExecutionCases = async () => {
  const executionIds = await getAllEntity({
    query: {
      type: TestType.Execution,
    },
  });

  console.info('updateAllExecutionCases executionIds length', executionIds.length);

  const queue = [];
  const size = 500;
  let index = 0;

  for (let i = 0; i < executionIds.length; i += size) {
    index++;
    queue.push({
      index,
      executionIds: executionIds.slice(i, i + size),
    });
  }

  console.info(`updateAllExecutionCases 合计 ${index} 批次`);

  for (const item of queue) {
    console.info(`updateAllExecutionCases ${item.index} 批次`, JSON.stringify(item.executionIds));

    await updateExecutionCases(item.executionIds);

    console.info(`updateAllExecutionCases ${item.index} 批次更新完成`);
  }

  console.info('updateAllExecutionCases-- complete');
};
