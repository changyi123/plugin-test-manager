import { requestCoreApi } from '@giteeteam/apps-team-api';

type SupportRequestMethods = Parameters<typeof requestCoreApi>[0];

const withCoreApiRequest = (
  info: [SupportRequestMethods, string | ((dynamicPath: string) => string)],
) => {
  return async function request(...args) {
    const params = typeof info[1] === 'function' ? args[1] : args[0];
    const path = typeof info[1] === 'function' ? info[1](args[0]) : info[1];
    return requestCoreApi(info[0], path, params) as any;
  };
};

/** 事项删除 */
export const deleteItems = withCoreApiRequest(['POST', '/parse/functions/deleteItems']);

/** 事项更新 */
export const updateItems = withCoreApiRequest([
  'PUT',
  itemId => `/parse/api/items/${itemId}/quickEdit`,
]);

/** 事项创建 */
export const createItems = withCoreApiRequest(['POST', '/parse/api/v2/items']);

/** IQL 查询 */
export const iqlSearch = withCoreApiRequest(['POST', '/parse/api/search']);
