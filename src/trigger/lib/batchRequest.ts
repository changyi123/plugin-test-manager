import pick from 'lodash/pick';
import { logTimeCost } from '../lib/logger';
import parallelLimit from 'async/parallelLimit';
import { deleteItems, updateItems, createItems } from './coreApi';
import { TestEntity, BaseTestEntity } from '../../common/types/test';
import { testEntityToItemValues, compactNilValue } from '../../common/utils/dataTransfer';

/** 并发数量 */
const ParallelLimit = 10;

/** 删除测试实体 */
export const batchDeleteItems = async (itemIds: string[]) => {
  await deleteItems({
    itemIds,
  });
};

/** 更新测试实体 */
export const batchUpdateItems = async (data: Partial<TestEntity>[]) => {
  const itemData = data.map(data => {
    // 允许更新自定义字段（支持内置字段 assignee. property）
    // 其他自定义字段不能进行更新
    const customValues = pick(data.values, ['assignee', 'property']);
    return {
      ...data,
      objectId: data.objectId,
      originalValues: customValues,
      values: testEntityToItemValues(data),
    };
  });

  const taskQueue = itemData.map(item => async () => {
    const values = compactNilValue({
      name: item.name,
      values: {
        ...item.originalValues,
        ...item.values,
      },
    });
    return updateItems(item.objectId, values);
  });

  const dump = logTimeCost(`update ${taskQueue.length} items`);
  const res = await parallelLimit(taskQueue, ParallelLimit);
  dump();
  return res;
};

/** 创建测试实体 */
export const batchCreateItems = async (
  data: ({
    name: string;
    workspace: string;
    itemType: string;
  } & Partial<BaseTestEntity>)[],
) => {
  /** 构建 pointer 类型数据 */
  const buildParsePointerData = (className, objectId) => {
    return {
      className,
      objectId,
      __type: 'Pointer',
    };
  };

  // 需要创建的事项数据
  const itemData = data.map(data => ({
    name: data.name,
    values: testEntityToItemValues(data),
    itemGroup: buildParsePointerData('ItemType', ''),
    itemType: buildParsePointerData('ItemType', data.itemType),
    workspace: buildParsePointerData('Workspace', data.workspace),
  }));

  console.log('values ------->', itemData);
  const taskQueue = itemData.map(item => async () => {
    const values = compactNilValue(item);
    return createItems(values);
  });

  const dump = logTimeCost(`create ${taskQueue.length} items`);
  const res = await parallelLimit(taskQueue, ParallelLimit);
  dump();
  return res;
};
