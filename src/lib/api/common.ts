import Parse from '@/lib/parse';
import { TestConfig } from '../models';
import { Workspace, Item, Test } from '@/lib/models';
import { TestType } from '@/lib/constants';

/**
 * 创建测试实体
 */
export const createTestEntity = (params: {
  itemId: string;
  type: TestType;
  workspaceId: string;
}) => {
  const newTest = new Test({
    type: params.type,
    workspace: Workspace.createWithoutData(params.workspaceId),
    reference: Item.createWithoutData(params.itemId),
  });

  return newTest.save();
};

/**
 * 获取测试实体
 */
export const getTestEntity = (itemId: string) => {
  return new Parse.Query(Test).equalTo('reference', itemId);
};

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
  return new Parse.Query(Workspace)
    .includes(['workspaceTemplate'])
    .equalTo('workspace', workspaceId);
};
