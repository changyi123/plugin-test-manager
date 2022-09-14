import { TestEntity } from '../../common/types/test';
import parallelLimit from 'async/parallelLimit';
import { requestCoreApi } from '@giteeteam/apps-team-api';
import { testEntityToItemValues } from '../../common/utils/dataTransfer';

/** 最大并发数量 */
const REQUEST_LIMIT = 10;

/** 删除测试实体 */
export const batchDeleteItems = async (itemIds: string[]) => {
  await requestCoreApi('POST', '/parse/functions/deleteItems', {
    itemIds,
  });
};

/** 更新测试实体 */
export const batchUpdateItems = async (testEntityData: Partial<TestEntity>[]) => {
  const updateItems = testEntityData.map(data => ({
    ...data,
    objectId: data.objectId,
    originalValues: data.values,
    values: testEntityToItemValues(data),
  }));

  const deleteItemTasks = updateItems.map(item => {
    return requestCoreApi('POST', `/parse/api/items/${item.objectId}`, {
      // TODO: 还有哪些字段需要批量更新？
      name: item.name,
      values: {
        ...item.originalValues,
        ...testEntityToItemValues(item.values),
      },
    });
  });

  return parallelLimit(deleteItemTasks, REQUEST_LIMIT);
};

/** 创建测试实体 */
export const batchCreateItems = async () => {};
