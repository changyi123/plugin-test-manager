import Parse from '@/lib/parse';
import { TestConfig } from '../models';
import { Workspace, Item } from '@/lib/models';

/**
 * 根据卡片 id
 */
export const getItemByIds = async (ids: string[]) => {
  const items = await new Parse.Query(Item)
    .containedIn('objectId', ids)
    .include(['itemType', 'status'])
    .map(item => item.toJSON());
  return items;
};

/**
 * 获取测试管理配置
 */
export const getTestConfig = (workspaceId: string) => {
  return new Parse.Query(TestConfig).equalTo('workspace', workspaceId).first();
};

export const updateTestConfig = () => {
  // TODO
};

/**
 * 获取空间模板已经配置过的 itemTypes（界面方案中使用的 itemType）
 */
export const getUsefulItemTypes = (workspaceId: string) => {
  new Parse.Query(Workspace).includes(['workspaceTemplate']);
};
