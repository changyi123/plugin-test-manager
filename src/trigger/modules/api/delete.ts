/**
 * @file 删除数据接口
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
// import { TestEntity } from '../../../common/types/test';
import { QueryTestEntityPayload } from '../../../common/types/api';
import { getReqInfoFromVMRuntime } from '../../../common/utils/api';

// const planId = 'wF8wtkoppB';
// const testId = ['DpcyuP46Un', 'YYmDIRsktC'];

/** 删除测试类型实体数据 */
export const deleteTestEntity = () => {
  const { payload } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();
  // TODO: 处理实体删除逻辑

  return {
    ...payload,
  };
};

// 删除测试计划
// 1、删除 计划 2、删除 计划 - 用例关系
// 删除测试用例
// 1、删除 用例 2、删除 执行
// 删除测试执行任务
// 1、删除 任务 2、删除 执行
// 删除测试执行
