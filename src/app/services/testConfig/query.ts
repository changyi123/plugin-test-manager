import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseBaseQueryOptions } from '@tanstack/react-query/src/types';

import Parse from '@/lib/parse';

import { TestConfig } from '../models';

/** query key */
export const TestConfigQueryKeys = {
  /** 全局配置 */
  global: ['testConfig', 'global'],
  /** 空间配置 */
  workspace: workspaceKey => ['testConfig', 'workspace', workspaceKey],
  /** id 缓存 */
  objectId: objectId => ['testConfig', objectId],
} as const;

/** 获取测试管理空间配置数据 */
export const useWorkspaceTestConfig = (
  workspaceKey: string,
  options?: UseBaseQueryOptions<any>,
) => {
  const queryClient = useQueryClient();
  return useQuery(
    TestConfigQueryKeys.workspace(workspaceKey),
    async () => {
      const data = await new Parse.Query(TestConfig)
        .equalTo('workspaceKey', workspaceKey)
        .first({ json: true });
      queryClient.setQueryData(TestConfigQueryKeys.objectId(data.objectId), data);
      return data;
    },
    {
      enabled: Boolean(workspaceKey),
      ...options,
    },
  );
};

/** 获取测试管理全局配置数据 */
export const useGlobalTestConfig = () => {
  const queryClient = useQueryClient();
  return useQuery(TestConfigQueryKeys.global, async () => {
    const data = await new Parse.Query(TestConfig).equalTo('global', true).first({ json: true });
    queryClient.setQueryData(TestConfigQueryKeys.objectId(data.objectId), data);
    return data;
  });
};
