import { useDataQuoteStore as useDataQuoteStoreInternal } from '@giteeteam/apps-team-components';
import { createHash } from '@giteeteam/apps-team-components/dist/lib/array';
import { isEmpty, isPlainObject } from 'lodash';
import fetch from 'proxima-sdk/lib/Fetch';
import Parse from 'proxima-sdk/lib/Parse';
import { IQLParams } from 'proxima-sdk/lib/types/iql';
import { Item } from 'proxima-sdk/schema/models';

//视图 - 基础报表只有默认视图
export type ViewType = 'Default';
// | 'Default'
// | 'Structure'
// | 'Kanban'
// | 'Gantt'
// | 'StoryMapping'
// | 'Calendar'
// | 'Split'
// | 'Hierarchy';

// 视图类型 - 基础报表只有默认视图
export const VIEW_TYPE: Record<ViewType, ViewType> = {
  Default: 'Default',
};

export const IQL_API = {
  [VIEW_TYPE.Default]: '/search',
};

interface ItemProps {
  values: any; // 不确定values的类型
  dataQuotes?: Record<string, unknown>;
}

export interface CustomArray<T> extends Array<T> {
  __hash?: any;
}

// proxima -> app -> lib -> models.d.ts -> Item 事项类型
type Item = any;
type FieldIdsType = any;

export interface SearchResult {
  items: Item[];
  count: number;
  totalCount?: number;
  depths?: number[];
  hitIds?: string[];
  rows?: string[];
  selectedOptions?: FieldIdsType;
}

export const iqlSearch = async (
  _queryKey: string,
  iqlParams: string | IQLParams,
  type = VIEW_TYPE.Default,
  iplApi = '',
  workspaceKeyOrId: string | Record<string, string> = '',
): Promise<SearchResult> => {
  const queryBody = typeof iqlParams === 'string' ? JSON.parse(iqlParams) : iqlParams;
  if (!isEmpty(workspaceKeyOrId)) {
    queryBody.refererInfo = {};
    if (typeof workspaceKeyOrId === 'string') {
      queryBody.refererInfo.workspaceKey = workspaceKeyOrId;
    } else if (isPlainObject(workspaceKeyOrId)) {
      if (workspaceKeyOrId.workspaceKey) {
        queryBody.refererInfo.workspaceKey = workspaceKeyOrId.workspaceKey;
      } else if (workspaceKeyOrId.workspaceId) {
        queryBody.refererInfo.workspaceId = workspaceKeyOrId.workspaceId;
      }
    }
  }
  const api = iplApi || IQL_API[type] || IQL_API[VIEW_TYPE.Default];
  // 所有延后低优先级接口为search接口让带宽
  // iqlDebug('iql-search-queryBody:', queryBody, _queryKey);
  const searchResult = await fetch.$post(api, queryBody);

  globalThis.iqlSearchDone = Date.now();

  if (searchResult?.payload?.items) {
    searchResult.payload.items.__hash = createHash();
  }
  return searchResult.payload;
};

// // 根据key查询item详情
export const fetchOptionsIql = (
  keys: string[],
  expression: string,
  extend?: Record<string, any>,
): Promise<any> => {
  const iqlParams = {
    iql: expression
      ? `(key in ${JSON.stringify(keys)}) and ${expression}`
      : `(key in ${JSON.stringify(keys)})`,
    size: 100,
    from: 0,
    ...(extend || {}),
  };
  return iqlSearch('data-quote-value', iqlParams, null).then(res => {
    return res.items;
  });
};

// 根据objectId查询item详情
export const getOptionsByValues = async (
  values: string[],
  expression?: string,
  extend?: Record<string, any>,
): Promise<Record<'label' | 'value', string>[]> => {
  const queryObject = new Parse.Query(Item);
  if (!values?.length) return;
  const list = await queryObject.containedIn('objectId', values).findAll();
  // 获取objectId对应的keys
  const keys = list.map(ele => {
    const item = ele.toJSON();
    return item?.key;
  });
  // value为空时不再请求数据
  if (!keys?.length) {
    return [];
  }
  //原因是查询时需要附加字段配置的iql语句,只能采用iql查询
  const items = await fetchOptionsIql(keys, expression, extend);
  const itemsMap = items.map(ele => {
    return {
      ...ele,
      label: ele?.name,
      value: ele?.objectId,
    };
  });
  return itemsMap;
};

export const useDataQuoteStore = (dataSources: CustomArray<ItemProps>): void => {
  useDataQuoteStoreInternal(dataSources, (values, expression) =>
    getOptionsByValues(values, expression, { includeHiddenItem: true }),
  );
};
