/**
 * @file 数据查询
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import { iqlRequest } from '../../lib/iqlRequest';
import { getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { QueryTestEntityPayload, QueryLinkedTestEntityPayload } from '../../../common/types/api';

/** 查询测试类型实体数据 */
export const queryTestEntity = async () => {
  const { payload } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();
  const { offset, limit, query, fields } = payload;

  return iqlRequest({
    query,
    pagination: { limit, offset },
    fields,
  });
};

/** 查询关联的测试实体数据 */
export const queryLinkedTestEntity = async () => {
  const { payload } = getReqInfoFromVMRuntime<QueryLinkedTestEntityPayload>();
  const { offset, limit, query, fields, linkItems, linkType, type } = payload;

  const appendSourceField = data => {
    console.info('data ---->', data);
    return data;
  };

  return iqlRequest({
    query: {
      ...query,
      linkItems,
      linkType,
      type,
    },
    pagination: { limit, offset },
    fields,
    dataTransfer: appendSourceField,
  });
};
