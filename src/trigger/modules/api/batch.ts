import pick from 'lodash/pick';
import { iqlRequest } from '../../lib/iqlRequest';
import { buildResponse } from '../../lib/apiUtil';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchDeleteItems, batchUpdateItems, batchCreateItems } from '../../lib/batchRequest';
import {
  BatchDeletePayload,
  BatchUpdatePayload,
  BatchCreateTestRunPayload,
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

/** 批量删除 */
export const batchDelete = async () => {
  try {
    const {
      body: { ids, skipDeletedLinkItems = false },
    } = getReqInfoFromVMRuntime<BatchDeletePayload>();
    if (!Array.isArray(ids)) throwArgumentError('ids', 'objectId[]');
    const tasks = [batchDeleteItems(ids)];

    // 删除关联关系中数据
    if (!skipDeletedLinkItems) {
      // 1. 查询关联的 items
      const {
        data: { list: linkedItems },
      } = await iqlRequest({
        query: {
          linkItems: ids,
        },
        pagination: { limit: 99999 },
        fields: [...IQLRequiredFieldKeys, TestFiledKeyMapping.linkItems],
      });

      // 2. 更新数据
      const needUpdateItemValues = linkedItems.map(item => {
        const data = pick(item, ['objectId', 'linkItems']);
        data.linkItems = data.linkItems.filter(id => !ids.includes(id));
        return data;
      });

      tasks.push(batchUpdateItems(needUpdateItemValues));
    }

    await Promise.all(tasks);
    return buildResponse('delete success');
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量更新 */
export const batchUpdate = async () => {
  try {
    const {
      body: { data },
    } = getReqInfoFromVMRuntime<BatchUpdatePayload>();
    if (!Array.isArray(data)) throwArgumentError('data', 'testEntity[]');
    // 校验需要保存的参数
    data.forEach(testEntityFieldTypeValidator);
    await batchUpdateItems(data);
    return buildResponse('update success');
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

    // 步骤
    // 1. 查所有测试用例
    // 2. 创建测试执行

    const {
      data: { list: caseList },
    } = await iqlRequest({
      query: {
        id: caseIds,
      },
      pagination: { limit: InfinityLimit },
      fields: [
        SystemField.Id,
        SystemField.Name,
        SystemField.Workspace,
        TestFiledKeyMapping.detail,
        TestFiledKeyMapping.sortIndex,
      ],
    });

    const testRunList = caseList.map(data => {
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
        runDetail: data.detail,
        // 空间和测试用例的空间保持一致
        workspace: data.workspace.objectId,
        // 事项类型使用内置的事项类型（不可变）
        itemType: BuiltInItemTypeMapping.TestRun,
        // 初始化状态为 TODO
        status: 'TODO',
        name: data.name,
        referenceCase: data.objectId,
        createdBy: data.createdBy,
      };
    });

    await batchCreateItems(testRunList as any);
    return buildResponse('create success');
    // 查询测试执行任务
  } catch (err) {
    return buildResponse(err);
  }
};
