import cloneDeep from 'lodash/cloneDeep';

import { PaginationParams, PaginationResponse, ResponseType } from '../../common/types/api';

/** 从 VM 运行时获取请求数据 */
export const getReqInfoFromVMRuntime = <TBody, THeader = any>(): {
  body: TBody;
  triggerParams: TBody;
  headers: THeader;
  sessionToken: string;
} => {
  const { headers = {}, body = {}, triggerParams } = global as any;
  return {
    body: cloneDeep(body) as TBody,
    triggerParams: cloneDeep(triggerParams) as TBody,
    headers: cloneDeep(headers) as THeader,
    sessionToken: global.sessionToken,
  };
};

/** 构建响应数据 */
export const buildResponse = <T = any>(data: T) => {
  let status = 'ok';
  if (data instanceof Error) {
    status = 'error';
  }
  // 异常类型 data 类型返回为 string
  return {
    status,
    data: status === 'error' ? (data as Error).message : data,
    stack: status === 'error' ? (data as Error).stack : undefined,
  } as ResponseType<T extends ErrorConstructor ? string : T>;
};

/** 构建分页响应数据 */
export const buildPaginationResponse = <T = any>(
  list: T,
  paginationResponseOptions?: PaginationParams & { total: number },
) => {
  let status = 'ok';
  if (list instanceof Error) {
    status = 'error';
  }

  return {
    status,
    data:
      status === 'error'
        ? (list as Error).message
        : {
            list,
            ...paginationResponseOptions,
          },
    stack: status === 'error' ? (list as Error).stack : undefined,
  } as PaginationResponse<T extends ErrorConstructor ? string : T[keyof T]>;
};
