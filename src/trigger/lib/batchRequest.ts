import parallelLimit from 'async/parallelLimit';
import { logTimeCost } from '../lib/logger';
import { TestEntity } from '../../common/types/test';
import { requestCoreApi } from '@giteeteam/apps-team-api';
import { testEntityToItemValues, compactNilValue } from '../../common/utils/dataTransfer';

/** 并发数量 */
const ParallelLimit = 10;

/** 删除测试实体 */
export const batchDeleteItems = async (itemIds: string[]) => {
  await requestCoreApi('POST', '/parse/functions/deleteItems', {
    itemIds,
  });
};

/** 更新测试实体 */
export const batchUpdateItems = async (data: Partial<TestEntity>[]) => {
  const updateItems = data.map(data => ({
    ...data,
    objectId: data.objectId,
    originalValues: data.values,
    values: testEntityToItemValues(data),
  }));

  const taskQueue = updateItems.map(item => async () => {
    const values = compactNilValue({
      // TODO: 还有哪些字段需要批量更新？
      name: item.name,
      values: {
        ...item.originalValues,
        ...testEntityToItemValues(item),
      },
    });
    return requestCoreApi('PUT', `/parse/api/items/${item.objectId}`, values);
  });

  const dump = logTimeCost(`update ${taskQueue.length} items`);
  const res = await parallelLimit(taskQueue, ParallelLimit);
  dump();
  return res;
};

/** 创建测试实体 */
export const batchCreateItems = async (
  data: (Partial<TestEntity> & { name: string; workspace: string; itemType: string })[],
) => {
  /** 构建 pointer 类型数据 */
  const buildParsePointerLikeData = (schema, objectId) => {
    return {};
  };

  // 需要创建的事项数据
  const createItems = data.map(item => {});
};
