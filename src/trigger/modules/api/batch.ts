import pick from 'lodash/pick';
import { iqlRequest } from '../../lib/iqlRequest';
import { buildResponse } from '../../lib/apiUtil';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchDeleteItems, batchUpdateItems } from '../../lib/batchRequest';
import { TestFiledKeyMapping, IQLMinimumFieldKeys } from '../../../common/constant';
import { BatchDeletePayload, BatchUpdatePayload } from '../../../common/types/api';
import { throwArgumentError, testEntityFieldTypeValidator } from '../../lib/validator';

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
        fields: [...IQLMinimumFieldKeys, TestFiledKeyMapping.linkItems],
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
    return buildResponse('DELETE SUCCESS');
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
    return buildResponse('UPDATE SUCCESS');
  } catch (err) {
    return buildResponse(err);
  }
};
