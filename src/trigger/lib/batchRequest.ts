import parallelLimit from 'async/parallelLimit';
import flatten from 'lodash/flatten';
import pick from 'lodash/pick';
import times from 'lodash/times';

import { BaseTestEntity, TestEntity } from '../../common/types/test';
import { compactNilValue, testEntityToItemValues } from '../../common/utils/dataTransfer';
import { logTimeCost } from '../lib/logger';
import {  createItems, deleteItems, updateItems } from './coreApi';

/** 并发数量 */
const ParallelLimit = global.env?.ParallelLimit ?? 10;
const UnRefreshLimit = global.env?.UnRefreshLimit ?? 10;

const getUnRefresh = data => ({ unRefresh: data?.length > UnRefreshLimit });

const CreateApiParseContext = {
  // 跳过事项创建校验
  skipFormValidation: true,
  // 跳过隐藏事项类型过滤
  skipItemTypeQueryFilter: true,
  // 跳过层级校验
  skipItemValidationLevel: true,
  // 更新版本号 跳过除 recordItemChange 外的以外行为
  // 跳过beforeSave的行为
  skipCheckWhetherArchived: true,
  skipItemValidation: true,
  skipPermission: true,
  skipFormulaCalculation: true,
  skipSnapshotValidate: true,
  skipFieldBehaviorValidation: true,
  skipValidateSecurityLevel: true,
  skipWorkflow: true,
  skipItemForest: true,
  skipRelationUser: true,
  // skipHandleApps: true,

  // 跳过afterSave的行为
  skipItemLink: true,
  skipUpdateWorkflowConfigUsers: true,
  skipItemType: true,
  skipSnapshot: true,
};

const sleep = time => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(undefined);
    }, time);
  });
};

/** 删除测试实体 */
export const batchDeleteItems = async (itemIds: string[]) => {
  const {
    deleteSize = 10,
    sleepTime = 1000,
    needSleepSize = 100,
  } = global.env?.DELETE_CONFIG || {};

  const num = Math.ceil(itemIds.length / deleteSize);
  const arr = times(num, String);
  const needSleep = itemIds.length > needSleepSize;
  const taskQueue = arr.map((_, index) => async () => {
    const start = index * deleteSize;
    const end = (index + 1) * deleteSize;

    const needDeleteItems = itemIds.slice(start, end).map(objectId => ({ objectId }));

    const res = await deleteItems(needDeleteItems);

    // 由于删除实体会触发删除trigger，删除大量的数据会占用过多资源，这里降一下速  TODO: 删除掉
    if (needSleep) {
      await sleep(sleepTime);
    }
    return res;
  });

  const dump = logTimeCost(
    `delete ${itemIds.length} items, parallelLimit ${deleteSize}, request ${num} times`,
  );
  const res = await parallelLimit(taskQueue, 1);
  dump();
  const flattenRes = flatten(res);
  console.info('----delete items result', res, flattenRes);
  return flattenRes as any[];
};

/** 更新测试实体 */
export const batchUpdateItems = async (data: Partial<TestEntity>[]) => {
  const itemData = data.map(data => {
    // 允许更新自定义字段（支持内置字段 assignee. priority
    // 其他自定义字段不能进行更新
    const customValues = pick(data.values, ['assignee', 'priority']);
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
      eventExtraData: { skipItemChange: true },
      parseContext: { ...CreateApiParseContext, ...getUnRefresh(data) },
    });

    return await updateItems(item.objectId, values);
  });

  const dump = logTimeCost(`update ${taskQueue.length} items`);
  const res = await parallelLimit(taskQueue, ParallelLimit);
  dump();
  return res;
};

type TokenSchema = Partial<Record<'objectId' | 'key', string>>;
/** 创建测试实体 */
export const batchCreateItems = async (
  data: ({
    name: string;
    workspace: TokenSchema;
    itemType: TokenSchema;
    itemGroup: TokenSchema;
  } & Partial<BaseTestEntity>)[],
  // 创建测试实体时取 data.values 的自定义数据
  fields?: string[],
) => {
  // 需要创建的事项数据
  const itemData = data.map(data => ({
    name: data.name,
    values: {
      ...testEntityToItemValues(data),
      // priority assignee 支持創建時更新
      ...pick(data.values, ['assignee', 'priority'].concat(fields ?? [])),
    },
    itemGroup: data.itemGroup,
    itemType: data.itemType,
    workspace: data.workspace,
    parseContext: { ...CreateApiParseContext, ...getUnRefresh(data) },
  }));

  const taskQueue = itemData.map(item => async () => {
    const values = compactNilValue(item);
    return createItems(values);
  });

  const dump = logTimeCost(`create ${taskQueue.length} items`);
  const res = await parallelLimit(taskQueue, ParallelLimit);
  dump();
  return res;
};
