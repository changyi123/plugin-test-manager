/**
 * @file 数据查询
 */

// app cli 不支持指定 tsconfig 需要使用相对路径
import pick from 'lodash/pick';
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
const concatIqlRequestFields = fields => {
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
};

const overwriteIqlParamsWithSelect = select => {
  if (Array.isArray(select)) {
    const fields = Array.from(
      new Set(select.map(key => TestFiledKeyMapping[key] ?? key).filter(Boolean)),
    );

    return {
      // select 只能筛选测试用例实体的 key
      dataTransfer: data => {
        return data.map(item => pick(item, select));
      },
      fields,
    };
  }
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
    fields: concatIqlRequestFields(fields),
    ...overwriteIqlParamsWithOnlySelectId(onlySelectId),
    ...overwriteIqlParamsWithSelect(select),
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
      pagination: { limit, offset },
      linkQuery: {
        linkType,
        sourceIds,
        destinationType,
      },
      fields: concatIqlRequestFields(fields),
      ...overwriteIqlParamsWithOnlySelectId(onlySelectId),
      ...overwriteIqlParamsWithSelect(select),
    });
  } catch (err) {
    return buildPaginationResponse(err);
  }
};
