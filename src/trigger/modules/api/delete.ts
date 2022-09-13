/**
 * @file 删除数据接口
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import { requestCoreApi } from '@giteeteam/apps-team-api';
import { QueryTestEntityPayload } from '../../../common/types/api';
import { getReqInfoFromVMRuntime } from '../../../common/utils/api';
import { updateItems } from './update';

// const planId = 'wF8wtkoppB';
// const testId = ['DpcyuP46Un', 'YYmDIRsktC'];

const deleteItem = async itemIds =>
  requestCoreApi('POST', '/parse/functions/deleteItems', {
    itemIds,
  });

const deleteItems = async itemList => {
  // 批量删除，requestCoreApi 不支持 DELETE，无法调用事项的批量删除
  const res = await Promise.all(itemList.map(item => deleteItem(item.objectId ?? item)));

  return res;
};

// 删除 plan  1、删除 计划 2、删除 计划 - 用例 关系
const deletePlan = async ids => {
  // 查询 计划-用例 关系，移除关系,根据 Iql
  // const itemsData = await iqlRequest(ids);
  const caseList = [];

  // 处理测试用例数据关系
  const handlePlanToCase = (datas: any[], planId: string[]) => {
    datas.map(d => ({
      objectId: d.objectId,
      name: d.name,
      key: d.key,
      values: {
        r_test_manager_linkItems:
          d.values?.r_test_manager_linkItems?.filter(i => !planId.includes(i)) ?? [],
      },
    }));
  };

  // 移除测试计划关联测试用例关系
  await updateItems(handlePlanToCase(caseList, ids));

  // 删除测试计划
  const res = deleteItems(ids);
  return res;
};

// 删除 case 1、删除 用例 2、删除 执行
const deleteCase = async payload => {
  const { itemId } = payload;

  // 查询 执行-用例 关系，移除关系,根据 Iql
  // const itemsData = await iqlRequest();
  const runList = [];

  // 获取 执行 ids 删除 run 删除 case
  // await updateTestEntitites()

  // 删除
  // requestCoreApi('PUT', '')

  return {
    itemId,
    message: '删除测试用例成功',
  };
};

// 删除 Execution 1、删除 任务 2、删除 执行
const deleteExecution = async payload => {
  const { itemId } = payload;
};

// 删除 run 1、删除 执行
const deleteRun = async payload => {
  const { itemId } = payload;

  const itemList = itemId.map(d => ({
    objectId: d,
  }));

  await deleteItems(itemList);
};

const DeleteTypeList = {
  Plan: deletePlan,
  Case: deleteCase,
  Execution: deleteExecution,
  Run: deleteRun,
};

/** 删除测试类型实体数据 */
export const deleteTestEntity = async () => {
  const { payload } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();
  const { id, type } = payload;
  // TODO 查询测试实体事项
  // const itemList = await queryTestEntity();

  const res = await DeleteTypeList[type]?.(id);

  // 根据测试实体类型判断删除逻辑
  // 先解除实体关系
  // 在删除事项

  return res;
};

// 删除测试计划
// 1、删除 计划 2、删除 计划 - 用例关系
// 删除测试用例
// 1、删除 用例 2、删除 执行
// 删除测试执行任务
// 1、删除 任务 2、删除 执行
// 删除测试执行
