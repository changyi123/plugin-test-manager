import { useQuery } from '@tanstack/react-query';

import Parse from '@/lib/parse';

import { TestConfig } from '../models';

/** query key */
export const TestConfigQueryKeys = {
  /** 全局配置 */
  global: ['testConfig', 'global'],
  /** 空间配置 */
  workspace: workspaceKey => ['testConfig', 'workspace', workspaceKey],
} as const;

/** 获取测试管理空间配置数据 */
export const useWorkspaceTestConfig = (workspaceKey: string) => {
  return useQuery(
    TestConfigQueryKeys.workspace(workspaceKey),
    async () => {
      return new Parse.Query(TestConfig)
        .equalTo('workspaceKey', workspaceKey)
        .first({ json: true });
    },
    {
      enabled: Boolean(workspaceKey),
    },
  );
};

/** 获取测试管理全局配置数据 */
export const useGlobalTestConfig = () => {
  return useQuery(TestConfigQueryKeys.global, async () => {
    return new Parse.Query(TestConfig).equalTo('global', true).first({ json: true });
  });
};
