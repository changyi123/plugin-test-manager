import pick from 'lodash/pick';
import { iqlRequest } from '../../lib/iqlRequest';
import { buildResponse } from '../../lib/apiUtil';
import {
  BatchDeletePayload,
  BatchUpdatePayload,
  BatchCreatePayload,
} from '../../../common/types/api';
import { batchDeleteItems, batchUpdateItems } from '../../lib/batchRequest';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';

/** 批量删除 */
export const batchDelete = async () => {
  try {
    const { body } = getReqInfoFromVMRuntime<BatchDeletePayload>();
    const tasks = [batchDeleteItems(body.ids)];

    // 删除关联关系中数据
    if (!body.skipDeletedLinkItems) {
      // 1. 查询关联的 items
      const {
        data: { list: linkedItems },
      } = await iqlRequest({
        query: {
          sourceIds: body.ids,
        },
        pagination: { limit: 99999 },
        fields: ['objectId', 'values'],
      });
      // 2. 更新数据
      const needUpdateItemValues = linkedItems.map(item => {
        return pick(item, ['objectId', 'sourceIds']);
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
    const { body } = getReqInfoFromVMRuntime<BatchUpdatePayload>();
    await batchUpdateItems(body.data);
    return buildResponse('UPDATE SUCCESS');
  } catch (err) {
    return buildResponse(err);
  }
};

/** 批量创建 */
export const batchCreate = async () => {
  const { body } = getReqInfoFromVMRuntime<BatchCreatePayload>();
};
