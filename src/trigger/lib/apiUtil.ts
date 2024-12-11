import { getParseQuery } from '@giteeteam/apps-team-api';
import cloneDeep from 'lodash/cloneDeep';

import { AppKey } from '../../common/constant';
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
  ids: string[],
  extendIql?: string,
): Promise<[any[], Item[]]> => {
  const links = await getParseQuery(false, 'ItemLink')
    ._orQuery([
      getParseQuery(false, 'ItemLink').containedIn('source', ids),
      getParseQuery(false, 'ItemLink').containedIn('destination', ids),
    ])
    .findAll({ useMasterKey: true });
  if (!links?.length) return [[], []];
  let iql = `id in ['${links
    .flatMap(d => [d.get('destination').objectId, d.get('source').objectId])
    .filter(id => !ids.includes(id))
    .join("','")}']`;
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
  const bugIds = items.map(i => i.id);
  let bugLinks = await getParseQuery(false, 'ItemLink')
    ._orQuery([
      getParseQuery(false, 'ItemLink').containedIn('source', bugIds),
      getParseQuery(false, 'ItemLink').containedIn('destination', bugIds),
    ])
    .findAll({ useMasterKey: true });

  const caseIql = `id in ['${bugLinks
    .flatMap(d => [d.get('destination').objectId, d.get('source').objectId])
    .filter(id => !bugIds.includes(id))
    .join("','")}'] and 'test_manager_type' = 'TestCase'`;

  const {
    payload: { items: cases },
  } = await iqlSearch({
    iql: caseIql,
    fields: ['id'],
    displayContext: AppKey,
    limit: bugLinks.length,
  });
  const caseIds = cases.map(i => i.id);

  bugLinks = bugLinks.map(i => i.toJSON());

  items.forEach(i => {
    i.isRelativeCase = false;
    bugLinks
      .filter(b => b.destination.objectId === i.id)
      .some(b => {
        if (caseIds.includes(b.source.objectId)) {
          i.isRelativeCase = true;
          return true;
        }
      });
    bugLinks
      .filter(b => b.source.objectId === i.id)
      .some(b => {
        if (caseIds.includes(b.destination.objectId)) {
          i.isRelativeCase = true;
          return true;
        }
      });
  });

  return [links.map(i => i.toJSON()), items];
};

// 在关联表中根据从sourceId查询到target
export const fetchByItemLinks = async (
  ids: string[],
  extendIql?: string,
  fields?: string[],
): Promise<[any[], Item[]]> => {
  const links = await getParseQuery(false, 'ItemLink')
    ._orQuery([
      getParseQuery(false, 'ItemLink').containedIn('source', ids),
      getParseQuery(false, 'ItemLink').containedIn('destination', ids),
    ])
    .findAll({ useMasterKey: true });
  if (!links?.length) return [[], []];
  let iql = `id in ['${links
    .flatMap(d => [d.get('destination').objectId, d.get('source').objectId])
    .filter(id => !ids.includes(id))
    .join("','")}']`;
  if (extendIql) {
    iql += ` and ${extendIql}`;
  }
  const {
    payload: { items },
  } = await iqlSearch({
    iql,
    displayContext: AppKey,
    fields: fields?.length ? fields : [],
    limit: links.length,
  });

  return [links.map(i => i.toJSON()), items];
};
