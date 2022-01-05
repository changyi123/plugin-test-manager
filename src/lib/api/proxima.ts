import { hasArrayItem } from '@/lib/utils/helper';

/**
 * proxima api 只为获取数据，返回数据为 JSON。不要在插件内修改 proxima 内的数据模型 ！！
 */
import Parse from '@/lib/parse';
import fetch from '@/lib/utils/fetch';
import { IQLBuilder } from '@/lib/utils/iql';
import { CustomField, Workspace, ItemType } from '@/lib/models';

type IQLPaginationParams = {
  offset?: number;
  limit?: number;
};

/**
 * 通过事项 id 获取 事项
 */
export const getItemByIQL = async (
  params: IQLPaginationParams & {
    // like
    nameLike?: string;
    itemId?: string | string[];
    // 需要排除的事项 id
    excludeItemId?: string[];
    itemKey?: string | string[];
    itemType?: string | string[];
    workspace?: string | string[];
    orderBy?: string[];
  },
) => {
  const { workspace, itemId, excludeItemId, nameLike, itemKey, itemType, orderBy, ...pagination } =
    params;

  const iql = new IQLBuilder();

  Array.isArray(workspace)
    ? iql.whereIn('workspaceKey', workspace)
    : iql.where('workspaceKey', workspace);

  Array.isArray(itemType)
    ? iql.whereIn('itemTypeKey', itemType)
    : iql.where('itemTypeKey', itemType);

  Array.isArray(excludeItemId) && iql.whereNot('id', excludeItemId);
  Array.isArray(itemId) ? iql.whereIn('id', itemId) : iql.where('id', itemId);
  Array.isArray(itemKey) ? iql.whereIn('事项ID', itemKey) : iql.where('事项ID', itemKey);

  if (nameLike && typeof nameLike === 'string') {
    iql.whereLike('标题', nameLike);
  }

  if (hasArrayItem(orderBy)) {
    iql.orderBy(orderBy[0] || '修改时间', (orderBy[1] as any) || 'desc');
  }

  const { data } = await fetch.post('/parse/api/search', {
    iql: iql.toString(),
    from: pagination.offset ?? 0,
    size: pagination.limit ?? 0,
  });
  return data.payload;
};

/**
 * 获取全部自定义字段
 */
export const getCustomFields = async () => {
  const query = new Parse.Query(CustomField).include('fieldType').limit(1000);

  const fields = await query.find();
  return fields.map(item => item.toJSON());
};

/**
 * 通过 workspaceKey 查询 workspace（不要问为什么又这个方法，proxima 处处会给你人来惊喜）
 */
export const getWorkspaceByKey = async key => {
  if (!key) return;
  const workspace = await new Parse.Query(Workspace).equalTo('key', key).first();
  return workspace?.toJSON();
};

/**
 * 通过 itemKey 获取 itemType （不要问为什么又这个方法，proxima 处处会给你人来惊喜）
 */
export const getItemTypeByKey = async key => {
  if (!key) return;
  const itemType = await new Parse.Query(ItemType).equalTo('key', key).first();
  return itemType?.toJSON();
};
