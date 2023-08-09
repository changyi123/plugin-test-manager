export type PaginationParams = {
  limit?: number;
  offset?: number;
};

export type OrderParams = {
  desc?: string[];
  asc?: string[];
};

export type QueryParamsGetters<
  TFunctionKeys extends Record<string, any>,
  TKey extends keyof TFunctionKeys,
> = Parameters<TFunctionKeys[TKey]>[0];
