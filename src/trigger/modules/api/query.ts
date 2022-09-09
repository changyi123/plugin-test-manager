/**
 * @file 数据查询
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { QueryTestEntityPayload } from '../../../common/types/api';
import { iqlRequest } from '../../lib/iqlRequest';

/** 查询测试类型实体数据 */
export const queryTestEntity = async () => {
  const { payload } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();
  const { offset, limit, ...params } = payload;

  return iqlRequest(params, {
    pagination: { limit, offset },
  });
};
