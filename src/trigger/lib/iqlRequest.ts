import dayjs from 'dayjs';
import { buildPaginationResponse } from './apiUtil';
import { TestEntity } from '../../common/types/test';
import { requestCoreApi } from '@giteeteam/apps-team-api';
import { PaginationParams, PaginationResponse } from '../../common/types/api';

import { IQLFieldNameMapping, IQLSearchFieldKeys } from '../../common/constant';
import { itemToTestEntity } from '../../common/utils/dataTransfer';
import iqlSearchParamsBuilder, { Operator } from '../../common/utils/iqlSearchParamsBuilder';

type IQLFiledKeys = keyof typeof IQLFieldNameMapping;

type RequestParams = {
  query?: Partial<Record<IQLFiledKeys, any>>;
  pagination?: PaginationParams;
  fields?: string[];
  dataTransfer?: (data: TestEntity[]) => Promise<any>;
};

/** iql 请求查询 */
export const iqlRequest = async (params: RequestParams) => {
  const { pagination = {}, fields, query, dataTransfer } = params;
  try {
    const customFieldParams = Object.keys(query)
      .filter(key => !IQLSearchFieldKeys.includes(key as any))
      .reduce(
        (prev, key) => ({
          ...prev,
          [key]: query[key],
        }),
        {},
      );

    // TODO: 处理自定义字段查询条件
    console.info('customFieldParams', customFieldParams);

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

    // IQLFieldNameMapping 中包含的自定义参数可以做默认的参数
    const registeredFieldParams = Object.keys(query)
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

    const payload = {
      ...registeredFieldParams,
    };

    const {
      payload: { count, items },
    }: any = await requestCoreApi(
      'POST',
      '/parse/api/search',
      iqlSearchParamsBuilder({
        payload,
        fields,
        ...pagination,
      }),
    );

    const testEntityList =
      typeof dataTransfer === 'function'
        ? await dataTransfer(items.map(itemToTestEntity))
        : items.map(itemToTestEntity);

    return buildPaginationResponse(testEntityList, {
      total: count,
      ...pagination,
    }) as PaginationResponse<TestEntity>;
  } catch (err) {
    return buildPaginationResponse(err);
  }
};
