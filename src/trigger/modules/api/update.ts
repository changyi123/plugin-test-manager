/**
 * @file 更新测试实体事项数据
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import { requestCoreApi } from '@giteeteam/apps-team-api';
import { QueryTestEntityPayload } from '../../../common/types/api';
import { getReqInfoFromVMRuntime } from '../../../common/utils/api';

const handlePayload = data =>
  data.map(d => ({
    objectId: d.objectId,
    values: Object.entries(d.values).map(([filed, value]) => ({
      key: filed,
      action: 'update',
      data: value,
    })),
  }));

// 更新事项自定义数据，批量更新和 Promise.all 时间接近
export const updateItems = async itemList => {
  const res = await requestCoreApi('POST', '/parse/api/items/bulk', itemList);

  return res;
};

// const update = async item =>
//   requestCoreApi('PUT', `/parse/api/items/${item.objectId}`, {
//     values: item.values,
//   });

// const batchUpdateItems = async itemList => {
//   const res = await Promise.all(itemList.map(item => update(item)));

//   return res;
// };

/** 更新测试类型实体数据，无关系处理 */
export const updateTestEntity = () => {
  const { payload } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();

  const res = updateItems(handlePayload(payload.data));

  return res;
};
