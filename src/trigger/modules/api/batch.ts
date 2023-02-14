import uniq from 'lodash/uniq';
import pick from 'lodash/pick';
import keyBy from 'lodash/keyBy';
import difference from 'lodash/difference';
import { iqlRequest } from '../../lib/iqlRequest';
import { buildResponse } from '../../lib/apiUtil';
import { TestEntity } from '../../../common/types/test';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { itemToTestEntity } from '../../../common/utils/dataTransfer';
import { batchDeleteItems, batchUpdateItems, batchCreateItems } from '../../lib/batchRequest';
import {
  BatchDeletePayload,
  BatchUpdatePayload,
  BatchCreateTestRunPayload,
  BatchCreateTestCasePayload,
} from '../../../common/types/api';
import { throwArgumentError, testEntityFieldTypeValidator } from '../../lib/validator';
import {
  TestType,
  SystemField,
  TestLinkType,
  InfinityLimit,
  TestFiledKeyMapping,
  IQLRequiredFieldKeys,
  BuiltInItemTypeMapping,
} from '../../../common/constant';
import { getParseQuery } from '@giteeteam/apps-team-api';

type TestCaseType = TestEntity<TestType.Case>;
type TestRunType = TestEntity<TestType.Run>;

/** 批量创建测试用例 */
export const batchCreateTestCase = async () => {
  try {
    const {
      body: { workspaceId, data },
    } = getReqInfoFromVMRuntime<BatchCreateTestCasePayload>();

    const generateSortIndex = (index = 0) => {
      return Math.floor(Date.now() / 1000) * 10e5 + index * 1000;
    };

    // 获取事项创建的必填字段
    const getItemRequiredAttrs = async () => {
      const ParseBaseQueryOptions = {
        sessionToken: global.sessionToken,
      };

      const [itemGroupQuery, testConfigQuery] = await Promise.all([
        getParseQuery(false, 'ItemGroup'),
        getParseQuery(false, 'test_manager_TestConfig'),
      ]);

      const itemGroupData = await itemGroupQuery
        .equalTo('workspace', workspaceId)
        .include(['workspace.key'])
        .select(['objectId', 'workspace.key'])
        .first(ParseBaseQueryOptions)
        .then(o => o.toJSON());

      const testConfigData = await testConfigQuery
        .equalTo('workspaceKey', itemGroupData?.workspace.key)
        .select(['itemTypeMap'])
        .first(ParseBaseQueryOptions)
        .then(o => o.toJSON());

      if (!testConfigData) throw new Error();

      return {
        itemType: { key: testConfigData.itemTypeMap.TestCase },
        itemGroup: { objectId: itemGroupData.objectId },
        workspace: { objectId: workspaceId },
      };
    };

    const requiredAttrs = await getItemRequiredAttrs();

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
      body: { ids, skipDeletedLinkItems = false },
    } = getReqInfoFromVMRuntime<BatchDeletePayload>();
    if (!Array.isArray(ids)) throwArgumentError('ids', 'objectId[]');
    // FIXME: delete 接口会有问题，响应完成但是 es 内事项数据可能不会更新，需要加一个 500ms 延迟
    const deleteItemsThenWait = ids => {
      return batchDeleteItems(ids).then(() => new Promise(resolve => setTimeout(resolve, 500)));
    };
    const tasks = [deleteItemsThenWait(ids)];

    // 删除关联关系中数据
    if (!skipDeletedLinkItems) {
      // 删除实体间的关联关系
      const appendDeleteLinkItemsTask = async testIds => {
        // 1. 查询关联的 items
        const {
          data: { list: linkedItems },
        } = await iqlRequest({
          query: {
            linkItems: testIds?.filter(Boolean),
          },
          pagination: { limit: InfinityLimit },
          fields: [...IQLRequiredFieldKeys, TestFiledKeyMapping.linkItems],
        });

        // 2. 更新数据
        const needUpdateItemValues = linkedItems?.map(item => {
          const data = pick(item, ['objectId', 'linkItems']);
          data.linkItems = data.linkItems.filter(id => !ids.includes(id));
          return data;
        });
        tasks.push(batchUpdateItems(needUpdateItemValues));
      };

      // 测试用例删除时需要删除引用的测试执行，所以先获得用例引用的执行
      const getReferencedTestRunIds = async () => {
        // 1. 查询关联的 items
        const {
          data: { list: testRuns },
        } = await iqlRequest({
          query: {
            referenceCase: ids,
          },
          pagination: { limit: InfinityLimit },
          fields: IQLRequiredFieldKeys,
        });

        return testRuns?.map(item => item.objectId);
      };

      const testRunIds = await getReferencedTestRunIds();

      tasks.push(deleteItemsThenWait(testRunIds));

      await appendDeleteLinkItemsTask(uniq([].concat(ids, testRunIds)));
    }

    await Promise.all(tasks);
    return buildResponse('delete success');
  } catch (err) {
    return buildResponse(err);
  }
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
      fields: [SystemField.Id, TestFiledKeyMapping.linkItems],
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
        const { linkItems: originalLinkItems = [] } = originalTestEntity;

        const { action, value } = linkItems as any;
        let processedLinkItems = value;
        if (action === 'delete') {
          processedLinkItems = difference(originalLinkItems, value);
        } else {
          processedLinkItems = Array.from(new Set([].concat(originalLinkItems, value)));
        }

        return {
          ...item,
          linkItems: processedLinkItems,
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
    const res = await batchUpdateItems(needUpdateItemData);
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

    // 创建测试执行
    // 1. 查所有测试用例
    // 2. 创建测试执行
    // 3. 过滤已规划的测试用例
    // 4. 创建测试执行并关联
    const batchCreateTestRuns = async () => {
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

      const [caseList, existedReferenceCaseIdSet] = await Promise.all([
        getTestCaseByCaseIds(),
        getExistedTestRunReferenceCaseIdSet(),
      ]);

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
            status: 'TODO',
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
    const batchUpdateTestPlanLinkCase = async () => {
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

        // 更新测试计划和测试用例的关联关系，使用 processLinkItemData 方法构建更新关联数据
        const needUpdateItemData = await processLinkItemData(linkItemParams);

        return await batchUpdateItems(needUpdateItemData);
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
