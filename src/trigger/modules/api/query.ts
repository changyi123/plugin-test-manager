/**
 * @file 数据查询
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import { toArray } from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';
import { testEntityFieldTypeValidator } from '../../lib/validator';
import { getReqInfoFromVMRuntime, buildPaginationResponse } from '../../lib/apiUtil';
import { QueryTestEntityPayload, QueryLinkedTestEntityPayload } from '../../../common/types/api';
import { IQLUsefulFieldKeys, IQLRequiredFieldKeys, InfinityLimit } from '../../../common/constant';

// 接口查询添加自定义字段
const concatCustomFields = fields => {
  return Array.from(new Set([].concat(IQLUsefulFieldKeys, fields)));
};

const overwriteIqlParamsWithOnlySelectId = onlySelectId => {
  if (onlySelectId) {
    return {
      dataTransfer: data => {
        return onlySelectId ? data.map(item => item.objectId) : data;
      },
      fields: IQLRequiredFieldKeys,
      pagination: { limit: InfinityLimit },
    };
  }

  return null;
};

/** 查询测试类型实体数据 */
export const queryTestEntity = async () => {
  const { body } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();
  const { offset, limit, fields, ascending, query = {}, selector, descending, onlySelectId } = body;

  return iqlRequest({
    query,
    selector,
    ascending,
    descending,
    pagination: { limit, offset },
    fields: concatCustomFields(fields),
    ...overwriteIqlParamsWithOnlySelectId(onlySelectId),
  });
};

/** 查询关联的测试实体数据 */
export const queryLinkedTestEntity = async () => {
  try {
    const { body } = getReqInfoFromVMRuntime<QueryLinkedTestEntityPayload>();
    const {
      limit,
      query,
      fields,
      offset,
      linkType,
      selector,
      ascending,
      descending,
      onlySelectId,
      destinationType,
      sourceIds: originalSourceIds,
    } = body;

    const sourceIds = toArray(originalSourceIds).filter(Boolean);
    // 请求参数校验
    testEntityFieldTypeValidator({ linkType, type: destinationType, linkItems: sourceIds });

    return iqlRequest({
      query,
      selector,
      ascending,
      descending,
      fields: concatCustomFields(fields),
      pagination: { limit, offset },
      linkQuery: {
        linkType,
        sourceIds,
        destinationType,
      },
      ...overwriteIqlParamsWithOnlySelectId(onlySelectId),
    });
  } catch (err) {
    return buildPaginationResponse(err);
  }
};
