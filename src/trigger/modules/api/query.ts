/**
 * @file 数据查询
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import { toArray } from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';
import { testEntityFieldTypeValidator } from '../../lib/validator';
import { getReqInfoFromVMRuntime, buildPaginationResponse } from '../../lib/apiUtil';
import { QueryTestEntityPayload, QueryLinkedTestEntityPayload } from '../../../common/types/api';
import {
  IQLUsefulFieldKeys,
  TestFiledKeyMapping,
  IQLRequiredFieldKeys,
  InfinityLimit,
} from '../../../common/constant';

// 处理 iql 请求的自定义字段
const processIqlRequestFields = (fields, select) => {
  // 如果有 select 则直接返回
  if (Array.isArray(select) && select[0])
    return select.map(key => TestFiledKeyMapping[key] ?? key).filter(Boolean);
  // fields 字段需要拼接测试实体字段和事项的必填字段
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
  const {
    offset,
    limit,
    select,
    fields,
    ascending,
    query = {},
    selector,
    descending,
    onlySelectId,
  } = body;

  return iqlRequest({
    query,
    selector,
    ascending,
    descending,
    pagination: { limit, offset },
    fields: processIqlRequestFields(fields, select),
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
      select,
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
      fields: processIqlRequestFields(fields, select),
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
