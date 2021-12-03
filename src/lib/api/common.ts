import Parse from '@/lib/parse';
import { TestConfig } from '../models';
import { Workspace } from '@/lib/models';

// 获取测试配置
export const getTestConfig = (workspaceId: string) => {
  return new Parse.Query(TestConfig).equalTo('workspace', workspaceId).first();
};

export const updateTestConfig = () => {
  // TODO
};

// 获取空间模板已经配置过的 itemTypes（界面方案中使用的 itemType）
export const getUsefulItemTypes = (workspaceId: string) => {
  const s = new Parse.Query(Workspace).includes(['workspaceTemplate.']);
};
