import dayjs from 'dayjs';

import { IQLFieldNameMapping, IQLSearchFieldKeys } from '../../common/constant';
import { iqlSearchParamsBuilder, Operator } from './iqlSearchParamsBuilder';

// iql 查询条件参数转换
const SearchParamsTransformStrategies = {
  // name 转换成 like
  name: value => ({
    value: value,
    operator: Operator.Like,
  }),
  createdAt: value => {
    const getStandardDateValue = date => dayjs(date).format('YYYY-MM-DD');
    return Array.isArray(value)
      ? {
          value: value.map(getStandardDateValue),
          operator: Operator.DateRange,
        }
      : null;
  },
};

export const batchQueryToIql = batchParams => {
  const { query = {}, selector = '' } = batchParams || {};
  const payload = Object.keys(query)
    .filter(key => IQLSearchFieldKeys.includes(key as any))
    .reduce(
      (prev, key) => ({
        ...prev,
        [IQLFieldNameMapping[key]]: SearchParamsTransformStrategies[key]
          ? SearchParamsTransformStrategies[key](query[key])
          : query[key],
      }),
      {},
    );
  const { iql } = iqlSearchParamsBuilder({
    payload,
    limit: 0,
    order: [],
    andCompositionIqlStr: selector,
  });
  return iql;
};

/**
 * 获取 环境变量
 */
export const getEnv = () => {
  return globalThis?.QiankunProps?.context?.env ?? globalThis?.env ?? {};
};
