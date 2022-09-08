import { ResponseType, PaginationParams, PaginationResponse } from 'common/types/api';

/** 从 VM 运行时获取请求数据 */
export const getReqInfoFromVMRuntime = <TPayload, THeader = any>(): {
  payload: TPayload;
  headers: THeader;
  env: Record<'appKey' | 'sessionToken' | 'applicationId', string>;
} => {
  return {
    payload: global.payload ?? {},
    headers: global.headers ?? {},
    env: {
      appKey: global.appKey,
      sessionToken: global.sessionToken,
      applicationId: global.applicationId,
    },
  };
};

/** 构建响应数据 */
export const buildResponse = <T extends any>(data: T) => {
  let status = 'ok';
  if (data instanceof Error) {
    status = 'error';
  }
  // 异常类型 data 类型返回为 string
  return {
    status,
    data,
  } as ResponseType<T extends ErrorConstructor ? string : T>;
};

/** 构建分页响应数据 */
export const buildPaginationResponse = <T extends any>(
  list: T,
  paginationResponseOptions: PaginationParams & { total: number },
) => {
  let status = 'ok';
  if (list instanceof Error) {
    status = 'error';
  }

  return {
    status,
    data: {
      list,
      ...paginationResponseOptions,
    },
  } as PaginationResponse<T extends ErrorConstructor ? string : T[keyof T]>;
};
