import { buildPaginationResponse } from './apiUtil';
import { TestEntity } from '../../common/types/test';
import { requestCoreApi } from '@giteeteam/apps-team-api';
import { PaginationParams, PaginationResponse } from '../../common/types/api';

import {} from '../../common/types/api';
import { IQLFieldNameMapping } from '../../common/constant';
import { itemToTestEntity } from '../../common/utils/dataTransfer';
import iqlSearchParamsBuilder from '../../common/utils/iqlSearchParamsBuilder';

const IQLFiledKeySet = new Set(Object.keys(IQLFieldNameMapping));

type IQLFiledKeys = keyof typeof IQLFieldNameMapping;

type RequestParams = Partial<Record<IQLFiledKeys, any>>;

type ResultOptions = {
  pagination?: PaginationParams;
};

/** iql 请求查询 */
export const iqlRequest = async (params: RequestParams, options: ResultOptions) => {
  const { pagination = {} } = options;
  try {
    const customFieldParams = Object.keys(params)
      .filter(key => !IQLFiledKeySet.has(key))
      .reduce(
        (prev, key) => ({
          ...prev,
          [key]: params[key],
        }),
        {},
      );

    // TODO: 处理自定义字段查询条件
    console.info('customFieldParams', customFieldParams);

    // 已经在系统上注册的可以直接作为参数
    const registeredFieldParams = Object.keys(params)
      .filter(key => IQLFiledKeySet.has(key))
      .reduce(
        (prev, key) => ({
          ...prev,
          [IQLFieldNameMapping[key]]: params[key],
        }),
        {},
      );

    const payload = {
      ...registeredFieldParams,
    };

    const {
      payload: { count, items },
    } = await requestCoreApi(
      'POST',
      '/parse/api/search',
      iqlSearchParamsBuilder({
        payload,
        ...pagination,
      }),
    );

    const testEntityList = items.map(itemToTestEntity);

    return buildPaginationResponse(testEntityList, {
      total: count,
      ...pagination,
    }) as PaginationResponse<TestEntity>;
  } catch (err) {
    return buildPaginationResponse(err);
  }
};
