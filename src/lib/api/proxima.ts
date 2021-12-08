/**
 * proxima api 只为获取数据，返回数据为 JSON。不要在插件内修改 proxima 内的数据模型 ！！
 */
import Parse from '@/lib/parse';
import { Item, Workspace } from '@/lib/models';

/**
 * 通过事项 id 获取 事项
 */
export const getItemByIds = async (ids: string[]) => {
  const items = await new Parse.Query(Item)
    .containedIn('objectId', ids)
    .include(['itemType', 'status'])
    .map(item => item.toJSON());
  return items;
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
