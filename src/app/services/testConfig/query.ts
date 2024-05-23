import { useQuery, useQueryClient } from '@tanstack/react-query';

import Parse from '@/lib/parse';

import { Status, TestConfig } from '../models';
import { QueryParamsGetters } from '../type';

const CacheTime = 5 * 60 * 1000;

/** query key */
export const TestConfigQueryKeys = {
  /** 全局配置 */
  global: ['testConfig', 'global'],
  /** 空间配置 */
  workspace: (params: { workspaceKey?: string }) => ['testConfig', params],
  /** id 缓存 */
  objectId: objectId => ['testConfig', objectId],
} as const;

export type TestConfigQueryKeysType = typeof TestConfigQueryKeys;

/** 获取测试管理空间配置数据 */
export const useWorkspaceTestConfig = (
  params: QueryParamsGetters<TestConfigQueryKeysType, 'workspace'>,
) => {
  const queryClient = useQueryClient();
  return useQuery(
    TestConfigQueryKeys.workspace(params),
    async () => {
      if (!params.workspaceKey) return;
      const data = await new Parse.Query(TestConfig)
        .equalTo('workspaceKey', params.workspaceKey)
        .first({ json: true })
        .then(async config => {
          // 更新配置状态名称
          const statusIds = config?.testRunAction?.statusList?.map(status => status.statusId) || [];
          if (!statusIds?.length) return config;
          const statusMap = await new Parse.Query(Status)
            .containedIn('objectId', statusIds)
            .find({ json: true })
            .then(status =>
              status.reduce((prev, cur) => ({ ...prev, [cur.objectId]: cur.name }), {}),
            );
          config.testRunAction.statusList.forEach(s => (s.name = statusMap[s.statusId]));
          return config;
        });
      queryClient.setQueryData(TestConfigQueryKeys.objectId(data.objectId), data);
      return data;
    },
    {
      cacheTime: CacheTime,
      staleTime: CacheTime,
      enabled: Boolean(params.workspaceKey),
    },
  );
};

/** 获取测试管理全局配置数据 */
export const useGlobalTestConfig = () => {
  const queryClient = useQueryClient();
  return useQuery(
    TestConfigQueryKeys.global,
    async () => {
      const data = await new Parse.Query(TestConfig).equalTo('global', true).first({ json: true });
      queryClient.setQueryData(TestConfigQueryKeys.objectId(data.objectId), data);
      return data;
    },
    {
      cacheTime: CacheTime,
      staleTime: CacheTime,
    },
  );
};
