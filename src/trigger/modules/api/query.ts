/**
 * @file 数据查询
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import { TestEntity } from '../../../common/types/test';
import { QueryTestEntityPayload } from '../../../common/types/api';
import { buildPaginationResponse, getReqInfoFromVMRuntime } from '../../../common/utils/api';

/** 查询测试类型实体数据 */
export const queryTestEntity = () => {
  const { payload } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();
  const { pageSize, current, id } = payload;
  //   // TODO: 处理实体查询逻辑
  console.info('id---->', id);
  return buildPaginationResponse<TestEntity[]>([], { total: 0, pageSize, current });
};
