import { requestCoreApi } from '@giteeteam/apps-team-api';

import { genAcceptLanguage, getLang } from './lang';

type SupportRequestMethods = Parameters<typeof requestCoreApi>[0];

const withCoreApiRequest = (
  info: [SupportRequestMethods, string | ((dynamicPath: string) => string)],
) => {
  return async function request(...args) {
    const isDynamicPath = typeof info[1] === 'function';
    const params = isDynamicPath ? args[1] : args[0];
    const path = isDynamicPath
      ? (info[1] as (dynamicPath: string) => string)(args[0])
      : (info[1] as string);
    const headers = (isDynamicPath ? args[2] : args[1]) ?? {};
    console.info(JSON.stringify({ isDynamicPath, params, path, headers }), 'withCoreApiRequest');

    return requestCoreApi(info[0], path, params, {
      ...headers,
      'accept-language': genAcceptLanguage(getLang()),
    }) as any;
  };
};

/** withCoreApiRequest get 方法不支持参数，需要拼接上url */
const jsonToUrlParam = (object: object | string) => {
  const params = [];
  const handle = (prev: string, current: object | string) => {
    if (typeof current !== 'object') return `${prev}=${current}`;
    for (const key of Object.keys(current)) {
      current[key] && params.push(handle(`${prev}[${key}]`, current[key]));
    }
  };
  handle('', object);
  return params.filter(Boolean).join('&');
};

/** 事项删除 */
export const deleteItems = withCoreApiRequest(['DELETE', '/parse/api/items/bulk']);

/** 事项更新 */
export const updateItems = withCoreApiRequest([
  'PUT',
  itemId => `/parse/api/items/${itemId}/quickEdit`,
]);

/** 事项批量更新 */
export const bulkUpdateItems = withCoreApiRequest(['POST', `/parse/api/apps/field/value`]);

/** 事项创建 */
export const createItems = withCoreApiRequest(['POST', '/parse/api/v2/items']);

/** 事项批量创建 */
export const bulkCreateItems = withCoreApiRequest(['POST', `/parse/api/v2/items/bulk`]);

/** IQL 查询 */
export const iqlSearch = withCoreApiRequest(['POST', '/parse/api/search']);

/** iql 聚合查询  */
export const aggsSearch = withCoreApiRequest([
  'POST',
  '/parse/api/report/normal-aggs-chart/search',
]);

/** 发送消息通知 */
export const sendMessage = withCoreApiRequest(['POST', '/connector/actions/send-email']);

// 查询字段设置
export const queryFields = withCoreApiRequest([
  'GET',
  params => `/parse/api/fields/search?${jsonToUrlParam(params as any)}`,
]);
