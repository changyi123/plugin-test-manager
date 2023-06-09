import { OrderParams, PaginationParams } from './type';

/** 绑定查询到 parseQuery */
export const bindPaginationToParseQuery = (parseQuery, params?: PaginationParams) => {
  if (params) {
    parseQuery
      .skip(params.offset ?? 0)
      .limit(params.limit ?? 10)
      .withCount();
  }
  return parseQuery;
};

/** 绑定排序到 parseQuery */
export const bindOrderToParseQuery = (parseQuery, params?: OrderParams) => {
  if (params) {
    if (params.desc) {
      parseQuery.descending(...params.desc);
    }
    if (params.asc) {
      parseQuery.ascending(...params.asc);
    }
  }

  return parseQuery;
};
