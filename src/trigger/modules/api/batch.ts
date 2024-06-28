import { i18n } from '@giteeteam/apps-api';
import { getParseQuery } from '@giteeteam/apps-team-api';
import isObject from 'lodash/isObject';

import {
  BuiltInItemTypeMapping,
  FIELD_TYPE,
  InfinityLimit,
  SystemField,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import {
  BatchCopyTestCasePayload,
  BatchCopyTestCaseV2Payload,
  BatchCreateTestCasePayload,
  BatchCreateTestRunPayload,
  BatchDeletePayload,
  BatchDeleteV2Payload,
  BatchUpdatePayload,
  BatchUpdateValuePayload,
} from '../../../common/types/api';
import { TestEntityLinkActionData } from '../../../common/types/common';
import { TestEntity } from '../../../common/types/test';
import { itemToTestEntity } from '../../../common/utils/dataTransfer';
import { buildResponse } from '../../lib/apiUtil';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import {
  batchCreateItems,
  batchDeleteItems,
  batchUpdateItems,
  batchUpdateItemsValues,
} from '../../lib/batchRequest';
import {
  buildTestEntityLinkData,
  concatIqlRequestFields,
  generateSortIndex,
  getAllEntity,
  uuidv4,
} from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';
import { getItemCreateRequiredAttrs } from '../../lib/item';
import { testEntityFieldTypeValidator, throwArgumentError } from '../../lib/validator';
import { queryFields } from './../../lib/coreApi';

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
    const res = await batchDeleteItems(ids);
    const errorItems = res?.filter(i => i.status !== 'success');
    if (errorItems?.length) {
      // 有错误数据
      return buildResponse(new Error(errorItems[0].message));
    } else {
      return buildResponse('delete success');
    }
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量删除 */
export const batchDeleteV2 = async () => {
  try {
    const {
      body: { queryParams },
    } = getReqInfoFromVMRuntime<BatchDeleteV2Payload>();
    const items = await getAllEntity(queryParams);
    const res = await batchDeleteItems(items);
    const errorItems = res?.filter(i => i.status !== 'success');
    if (errorItems?.length) {
      // 有错误数据
      return buildResponse(new Error(errorItems[0].message));
    } else {
      return buildResponse('delete success');
    }
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

/** 批量更新 */
export const batchUpdate = async () => {
  try {
    const {
      //@todo 待core支持事项批量更新接口
      body: { data, onlyValues = true },
    } = getReqInfoFromVMRuntime<BatchUpdatePayload>();
    if (!Array.isArray(data)) throwArgumentError('data', 'testEntity[]');

    // 需要更新的事项
    const needUpdateItemData = await buildTestEntityLinkData(data as TestEntityLinkActionData[]);
    // 校验需要保存的参数
    needUpdateItemData.forEach(testEntityFieldTypeValidator);
    const tasks = [
      onlyValues
        ? batchUpdateItems(needUpdateItemData)
        : batchUpdateItemsValues(needUpdateItemData),
    ];

    // 移除测试计划下的测试用例关联的测试执行
    const needDeleteTestRunIds = await getRunDataByLinkItemDelete(data);
    if (needDeleteTestRunIds?.length) {
      tasks.push(batchDeleteItems(needDeleteTestRunIds));
    }
    const [res] = await Promise.all(tasks);
    return buildResponse(res.filter(Boolean).map(data => itemToTestEntity(data.item)));
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量更新 固定值 */
export const batchUpdateValue = async () => {
  try {
    const {
      body: { queryParams, value },
    } = getReqInfoFromVMRuntime<BatchUpdateValuePayload>();
    if (!value) throwArgumentError('data', 'testEntity[]');
    const ids = await getAllEntity(queryParams);
    const data = ids.map(objectId => ({
      objectId,
      ...value,
    }));

    // 需要更新的事项
    const needUpdateItemData = await buildTestEntityLinkData(data as TestEntityLinkActionData[]);
    // 校验需要保存的参数
    needUpdateItemData.forEach(testEntityFieldTypeValidator);
    const tasks = [batchUpdateItemsValues(needUpdateItemData)];

    const [res] = await Promise.all(tasks);
    return buildResponse(res.filter(Boolean).map(data => itemToTestEntity(data.item)));
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
            // 修改测试执行详情数据在创建时确定
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

        // 更新测试计划和测试用例的关联关系，使用 buildLinkItemData 方法构建更新关联数据
        const needUpdateItemsData = await buildTestEntityLinkData(
          linkItemParams as TestEntityLinkActionData[],
        ).then(data => {
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
        if (!needUpdateItemsData.length) return;

        return await batchUpdateItemsValues(needUpdateItemsData);
      }
    };

    const [createdTestRuns] = await Promise.all([
      batchCreateTestRuns(),
      batchUpdateTestPlanLinkCase(),
    ]);

    const createdItemIds = createdTestRuns.filter(Boolean).map(item => item.objectId);
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
        [FIELD_TYPE.SPRINT, FIELD_TYPE.VERSION, FIELD_TYPE.CUSTOM_VERSION].includes(
          item.fieldType.key,
        ),
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
    const {
      body: { queryParams, fields, workspaceKey: originWorkspaceKey, to },
      sessionToken,
    } = getReqInfoFromVMRuntime<BatchCopyTestCaseV2Payload>();
    const workspaceKey = originWorkspaceKey ?? to?.workspaceKey;
    const copyName = i18n.t('trigger.copyName');
    if (!queryParams) throwArgumentError('queryParams', '{ query, selector }');

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
        [FIELD_TYPE.SPRINT, FIELD_TYPE.VERSION, FIELD_TYPE.CUSTOM_VERSION].includes(
          item.fieldType.key,
        ),
      )
      .map(item => item.key);

    const caseList = await getAllEntity(queryParams, concatIqlRequestFields(fields));

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

    console.info(JSON.stringify({ newWorkspace, caseList, to }), 'info-------');
    const needCreateItems = caseList.map((data, index) => ({
      name:
        (newWorkspace && newWorkspace?.objectId !== data.workspace?.objectId) ||
        (to && to?.repository !== data?.repository)
          ? data.name
          : `${data.name}_${copyName}`,
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
      repository: to ? to.repository : data.repository,
    }));

    const copyItems = await batchCreateItems(needCreateItems as any, fields, sessionToken);
    return buildResponse(copyItems);
  } catch (err) {
    return buildResponse(err);
  }
};
