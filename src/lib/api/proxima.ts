import { hasArrayItem } from '@/lib/utils/helper';

/**
 * proxima api 只为获取数据，返回数据为 JSON。不要在插件内修改 proxima 内的数据模型 ！！
 */
import Parse from '@/lib/parse';
import fetch from '@/lib/utils/fetch';
import { IQLBuilder } from '@/lib/utils/iql';
import { Item, Workspace } from '@/lib/models';

type IQLPaginationParams = {
  form?: number;
  size?: number;
};

/**
 * 通过事项 id 获取 事项
 */
export const getItemByIQL = async (
  params: IQLPaginationParams & {
    itemId?: string | string[];
    itemKey?: string | string[];
    itemType?: string | string[];
    workspace?: string | string[];
    orderBy?: string[];
  },
) => {
  const { workspace, itemId, itemKey, itemType, orderBy, ...pagination } = params;

  const iql = new IQLBuilder();

  Array.isArray(workspace)
    ? iql.whereIn('workspaceKey', workspace)
    : iql.where('workspaceKey', workspace);

  Array.isArray(itemType)
    ? iql.whereIn('itemTypeKey', itemType)
    : iql.where('itemTypeKey', itemType);

  Array.isArray(itemId) ? iql.whereIn('id', itemId) : iql.where('id', itemId);
  Array.isArray(itemKey) ? iql.whereIn('事项ID', itemKey) : iql.where('事项ID', itemKey);

  if (hasArrayItem(orderBy)) {
    iql.orderBy(orderBy[0] || '创建时间');
  }

  const { data } = await fetch.post('/parse/api/search', {
    iql: iql.toString(),
    form: pagination.form ?? 0,
    size: pagination.size ?? 0,
  });
  return data.payload;
};

/**
 * 通过 workspace key 查询 workspace
 */
export const getWorkspaceByKey = async (key: string) => {
  const [workspace] = await new Parse.Query(Workspace)
    .equalTo('key', key)
    .map(item => item.toJSON());
  return workspace;
};
