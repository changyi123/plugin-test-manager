/**
 * @file 数据查询
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import { iqlRequest } from '../../lib/iqlRequest';
import { testEntityFieldTypeValidator } from '../../lib/validator';
import { getReqInfoFromVMRuntime, buildPaginationResponse } from '../../lib/apiUtil';
import { QueryTestEntityPayload, QueryLinkedTestEntityPayload } from '../../../common/types/api';

/** 查询测试类型实体数据 */
export const queryTestEntity = async () => {
  const { body } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();
  const { offset, limit, query = {}, fields } = body;

  return iqlRequest({
    query,
    pagination: { limit, offset },
    fields,
  });
};

/** 查询关联的测试实体数据 */
export const queryLinkedTestEntity = async () => {
  try {
    const { body } = getReqInfoFromVMRuntime<QueryLinkedTestEntityPayload>();
    const { offset, limit, query, fields, sourceIds, linkType, destinationType } = body;

    // 请求参数校验
    testEntityFieldTypeValidator({ linkType, type: destinationType, linkItems: sourceIds });

    const appendLinkField = data => {
      return data;
    };

    return iqlRequest({
      query,
      fields,
      pagination: { limit, offset },
      dataTransfer: appendLinkField,
      linkQuery: {
        linkType,
        sourceIds,
        destinationType,
      },
    });
  } catch (err) {
    return buildPaginationResponse(err);
  }
};
