import { i18n } from '@giteeteam/apps-team-api';
import difference from 'lodash/difference';
import keyBy from 'lodash/keyBy';

import {
  BuiltInItemTypeMapping,
  InfinityLimit,
  SystemField,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import {
  BatchCopyTestCasePayload,
  BatchCreateTestCasePayload,
  BatchCreateTestRunPayload,
  BatchDeletePayload,
  BatchUpdatePayload,
} from '../../../common/types/api';
import { TestEntity } from '../../../common/types/test';
import { itemToTestEntity } from '../../../common/utils/dataTransfer';
import { buildResponse } from '../../lib/apiUtil';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchCreateItems, batchDeleteItems, batchUpdateItems } from '../../lib/batchRequest';
import { concatIqlRequestFields, generateSortIndex, uuidv4 } from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';
import { getItemCreateRequiredAttrs } from '../../lib/item';
import { testEntityFieldTypeValidator, throwArgumentError } from '../../lib/validator';

type TestCaseType = TestEntity<TestType.Case>;
type TestRunType = TestEntity<TestType.Run>;
type TestExecutionType = TestEntity<TestType.Execution>;

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

    const res = await batchCreateItems(params as any);
    return buildResponse(res.map(itemToTestEntity));
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量删除 */
export const batchDelete = async () => {
  try {
    const {
      body: { ids },
    } = getReqInfoFromVMRuntime<BatchDeletePayload>();
    if (!Array.isArray(ids)) throwArgumentError('ids', 'objectId[]');
    // FIXME: delete 接口会有问题，响应完成但是 es 内事项数据可能不会更新，需要加一个 500ms 延迟
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
    const tasks = [deleteItemsThenWait(ids)];
    await Promise.all(tasks);
    return buildResponse('delete success');
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
    pagination: { limit: InfinityLimit, offset: 0 },
  });

  return runData?.map(d => d.objectId);
};

/**
 * 处理事项关联数据(将含有参数中 linkItems 的数据转换成事项自定义字段数据)
 *
 */
const processLinkItemData = async data => {
  const isActionSchema = data =>
    ['add', 'delete'].includes(data?.action) && Array.isArray(data?.value);

  // linkItems 支持 { action: 'add' | 'delete', value: [] } 格式更新
  // 需要对该类型参数进行处理
  const needProcessedEntityIds = data
    .filter(item => isActionSchema(item.linkItems))
    .map(item => item.objectId);

  let needUpdateItemData = data as any;

  if (needProcessedEntityIds?.[0]) {
    const {
      data: { list: originalTestEntityMapping },
    } = await iqlRequest({
      query: {
        id: needProcessedEntityIds,
      },
      fields: [SystemField.Id, TestFiledKeyMapping.linkItems, TestFiledKeyMapping.linkType],
      pagination: {
        limit: InfinityLimit,
      },
      dataTransfer: data => keyBy(data, 'objectId'),
    });

    needUpdateItemData = data.map(item => {
      const { linkItems, objectId } = item;

      if (isActionSchema(linkItems)) {
        const originalTestEntity = originalTestEntityMapping[objectId];
        if (!originalTestEntity) return data;
        const { linkItems: originalLinkItems = [], linkType: originalLinkType } =
          originalTestEntity;

        const { action, value } = linkItems as any;
        const processedLinkData = { linkItems: value } as any;
        if (action === 'delete') {
          const linkItems = difference(originalLinkItems, value);
          processedLinkData.linkItems = linkItems?.length ? linkItems : null;
          if (originalLinkType && !linkItems?.length) {
            processedLinkData.linkType = null;
          }
        } else {
          processedLinkData.linkItems = Array.from(new Set([].concat(originalLinkItems, value)));
        }

        return {
          ...item,
          ...processedLinkData,
        };
      }

      return data;
    });
  }

  return needUpdateItemData;
};

/** 批量更新 */
export const batchUpdate = async () => {
  try {
    const {
      body: { data },
    } = getReqInfoFromVMRuntime<BatchUpdatePayload>();
    if (!Array.isArray(data)) throwArgumentError('data', 'testEntity[]');

    // 需要更新的事项
    const needUpdateItemData = await processLinkItemData(data);
    // 校验需要保存的参数
    needUpdateItemData.forEach(testEntityFieldTypeValidator);
    const tasks = [batchUpdateItems(needUpdateItemData)];

    // 移除测试计划下的测试用例关联的测试执行
    const needDeleteTestRunIds = await getRunDataByLinkItemDelete(data);
    if (needDeleteTestRunIds?.length) {
      tasks.push(batchDeleteItems(needDeleteTestRunIds));
    }
    const [res] = await Promise.all(tasks);
    return buildResponse(res.map(data => itemToTestEntity(data.item)));
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量创建测试执行任务 */
export const batchCreateTestRun = async () => {
  try {
    const {
      body: { executionId, caseIds },
    } = getReqInfoFromVMRuntime<BatchCreateTestRunPayload>();

    if (!Array.isArray(caseIds)) throwArgumentError('caseIds', 'objectId[]');

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
          SystemField.Name,
          SystemField.ItemGroup,
          SystemField.Workspace,
          TestFiledKeyMapping.detail,
          TestFiledKeyMapping.sortIndex,
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

    // 初始的任务 key
    const StartStatusKey = 'TODO';

    const [caseList, testPlan, existedReferenceCaseIdSet] = await Promise.all([
      getTestCaseByCaseIds(),
      getExecutionLinkedTestPlan(),
      getExistedTestRunReferenceCaseIdSet(),
    ]);

    // 创建测试执行
    // 1. 查所有测试用例
    // 2. 创建测试执行
    // 3. 过滤已规划的测试用例
    // 4. 创建测试执行并关联
    const batchCreateTestRuns = async () => {
      const needCreatedItems = caseList
        // 过滤已规划的测试用例
        .filter(testCase => !existedReferenceCaseIdSet.has(testCase.objectId))
        // 生成需要创建的测试执行属性
        .map(data => {
          // 关联数据，测试执行关联测试执行任务
          const linkData = executionId
            ? {
                linkType: TestLinkType.RunLinkExecution,
                linkItems: [executionId],
              }
            : null;

          return {
            ...linkData,
            type: TestType.Run,
            // runDetail: data.detail,
            runDetail: {},
            // 空间和测试用例的空间保持一致
            workspace: data.workspace,
            // 测试执行的 sortIndex 和 测试用例的保持一致
            sortIndex: data.sortIndex,
            // 事项类型使用内置的事项类型（不可变）
            itemType: { key: BuiltInItemTypeMapping.TestRun },
            // // 事项组
            itemGroup: (data as any).itemGroup,
            // 初始化状态为 TODO
            status: StartStatusKey,
            name: data.name,
            referenceCase: data.objectId,
            createdBy: data.createdBy,
          };
        });

      return await batchCreateItems(needCreatedItems as any);
    };

    // 创建测试计划和测试用例的关联关系
    // 1. 获取测试执行任务关联的测试计划
    // 2. 更新测试计划和测试用例的关联
    // 3. 将 caseStatus 中的 caseStatus 置为 TODO
    const batchUpdateTestPlanLinkCase = async () => {
      // 可能存在测试执行任务没有关联计划的情况，需要做容错处理
      if (testPlan) {
        const linkItemParams = caseIds.map(caseId => ({
          objectId: caseId,
          linkType: TestLinkType.CaseLinkPlan,
          linkItems: {
            action: 'add',
            value: [testPlan.objectId],
          },
        }));

        // 原始测试用例的状态数据映射
        const originalCaseStatusDataMapping = caseList.reduce(
          (res, testCase) => ({
            ...res,
            [testCase.objectId]: testCase.caseStatus,
          }),
          {},
        );

        // 更新测试计划和测试用例的关联关系，使用 processLinkItemData 方法构建更新关联数据
        const needUpdateItemsData = await processLinkItemData(linkItemParams).then(data => {
          return data.map(item => {
            // 原始的测试执行状态
            const originalCaseStatus = originalCaseStatusDataMapping?.[item.objectId];
            // 当前计划已有最新测试执行状态，则不做处理
            const caseLatestStatus = originalCaseStatus?.[testPlan.objectId];

            // 不存在最新的测试执行状态，则需要更新一个默认值
            if (!caseLatestStatus) {
              item.caseStatus = {
                ...originalCaseStatus,
                // 将测试用例的设置为起始的 key
                [testPlan.objectId]: StartStatusKey,
              };
            }
            return item;
          });
        });

        return await batchUpdateItems(needUpdateItemsData);
      }
    };

    const [createdTestRuns] = await Promise.all([
      batchCreateTestRuns(),
      batchUpdateTestPlanLinkCase(),
    ]);

    const createdItemIds = createdTestRuns.map(item => item.objectId);
    console.info('create success res: ', createdItemIds);
    return buildResponse(createdItemIds);
    // 查询测试执行任务
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量复制测试用例 */
export const batchCopyTestCase = async () => {
  try {
    const {
      body: { caseIds, fields },
    } = getReqInfoFromVMRuntime<BatchCopyTestCasePayload>();
    const copyName = i18n.t('trigger.copyName');

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
      throw new Error('caseList is null');
    }

    const needCreateItems = caseList.map((data, index) => ({
      name: `${data.name}_${copyName}`,
      type: data.type,
      sortIndex: generateSortIndex(index),
      workspace: data.workspace,
      values: data.values,
      itemType: data.itemType,
      detail: data.detail
        ? {
            ...data.detail,
            steps: data.detail?.steps?.map(s => ({
              ...s,
              id: uuidv4(),
            })),
          }
        : {},
      repository: data.repository,
    }));

    const copyItems = await batchCreateItems(needCreateItems as any, fields);
    return buildResponse(copyItems);
  } catch (err) {
    return buildResponse(err);
  }
};
