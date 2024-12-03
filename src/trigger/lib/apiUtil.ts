import { getParseQuery } from '@giteeteam/apps-team-api';
import cloneDeep from 'lodash/cloneDeep';

import { AppKey, TestFiledKeyMapping, TestType } from '../../common/constant';
import { PaginationParams, PaginationResponse, ResponseType } from '../../common/types/api';
import { Item } from '../../common/types/app';
import { iqlSearch } from '../../trigger/lib/coreApi';

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

// 在关联表中根据从sourceId查询到target，并确认改缺陷是否关联用例
export const fetchBugFromItemLinks = async (
  sourceId: string[],
  extendIql?: string,
): Promise<[any[], Item[]]> => {
  const links = await getParseQuery(false, 'ItemLink')
    .containedIn('source', sourceId)
    .findAll({ sessionToken: global.sessionToken });
  if (!links?.length) return [[], []];
  let iql = `id in ['${links.map(d => d.get('destination').objectId).join("','")}']`;
  if (extendIql) {
    iql += ` and ${extendIql}`;
  }
  const {
    payload: { items },
  } = await iqlSearch({
    iql,
    displayContext: AppKey,
    limit: links.length,
  });

  // 通过事项关联查询，获取缺陷对应的事项，通过TestType.case来判断是否是测试用例
  let bugLinks = await getParseQuery(false, 'ItemLink')
    .containedIn(
      'destination',
      items.map(i => i.id),
    )
    .include('source')
    .findAll({ sessionToken: global.sessionToken });

  bugLinks = bugLinks.map(i => i.toJSON());

  items.forEach(i => {
    i.isRelativeCase = false;
    bugLinks
      .filter(b => b.destination.objectId === i.id)
      .some(b => {
        if (b.source.values[TestFiledKeyMapping.type] === TestType.Case) {
          i.isRelativeCase = true;
          return true;
        }
      });
  });

  return [links.map(i => i.toJSON()), items];
};
