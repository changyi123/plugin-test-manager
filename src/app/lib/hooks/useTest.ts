import { pick } from 'lodash';
import Parse from '@/lib/parse';
import { useRequest, useMemoizedFn } from 'ahooks';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { getPluginBoundWorkspaces } from '@/lib/api/proxima';
import { TestType, BuiltinFieldNameMapping } from '@/lib/constants';
import { getFolderTree, getRepositoryData } from '../api/repository';
import {
  getTestConfig,
  getAllTestConfigs,
  getTestEntitiesByRelationWithOrder,
} from '@/lib/api/common';
import React from 'react';
import { getRepoData, handleRepoPath } from '@/components/business/RepositoryGroup/repository';
import { repositoryFolderTreeEvent } from '@/lib/events';
import { hasArrayItem } from '../utils/helper';
import { getTestEntityByQuery } from '@/lib/api/item';

type GetTestEntityParams = Parameters<typeof getTestEntitiesByRelationWithOrder>;
/** 获取所有事项实体 id */
export const useAllRelTestEntities = (
  relType: GetTestEntityParams['0'],
  sides: GetTestEntityParams['1'],
  options?: {
    include: string[];
  },
) => {
  let include = ['objectId'];
  if (Array.isArray(options?.include)) {
    include = ['objectId'].concat(options.include);
  }
  const sideValues = Object.values(sides).filter(Boolean);
  const { data, mutate, refresh } = useRequest(
    async () => {
      const { list } = await getTestEntitiesByRelationWithOrder(relType, sides, {
        include,
        select: include,
        queryParams: { limit: 9999 },
      });
      return list?.map(item => (include?.length === 1 ? item.objectId : pick(item, include)));
    },
    {
      ready: Boolean(sideValues.length),
    },
  );

  return {
    mutate,
    refresh,
    testEntities: data ?? [],
  };
};

/** 获取当前用户信息 */
export const useCurrentUser = () => {
  const { data } = useRequest(
    async () => {
      const data = await Parse.User.current();
      return data.toJSON();
    },
    {
      cacheKey: `current_user`,
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  return data;
};

/** 获取当前空间配置 */
export const useWorkspaceTestConfig = workspaceKey => {
  const { data: testConfig } = useRequest(
    async () => {
      const testConfig = await getTestConfig({ workspaceKey });
      return testConfig.toJSON();
    },
    {
      cacheKey: `test_config_${workspaceKey}`,
      ready: Boolean(workspaceKey),
      cacheTime: 99999999999,
      staleTime: 99999999999,
      refreshDeps: [workspaceKey],
    },
  );
  return testConfig;
};

/* 判断是否空间隔离 */
export const useIsolateTestType = (workspaceKey: string, testType: TestType) => {
  const testConfig = useWorkspaceTestConfig(workspaceKey);

  if (!Array.isArray(testConfig?.isolateTestType)) return true;
  return testConfig.isolateTestType.includes(testType);
};

/** 请求用例库模块 */
export const useTestRepositoryFolderTree = workspaceKey => {
  return useNoExpiredRequest(() => getFolderTree(workspaceKey), {
    cacheKey: `folder_tree_${workspaceKey}`,
    refreshDeps: [workspaceKey],
  });
};

/** 获取所有的测试空间 */
export const useAllTestWorkspace = () => {
  const { data: allTestWorkspaces } = useRequest(
    async () => {
      return getPluginBoundWorkspaces();
    },
    {
      cacheKey: 'AllTestWorkspaces',
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  return allTestWorkspaces;
};

export const useGetTestRepoGroup = (rowData: any) => {
  const workspaceKey = rowData?.workspace?.key;
  const folderKey = rowData?.repository;

  const { data: repositoryData, refreshAsync: refreshRepositoryData } = useRequest(
    () => getRepositoryData(workspaceKey ? [workspaceKey] : []),
    {
      cacheKey: `repository_data_${workspaceKey ?? ''}`,
      refreshDeps: [workspaceKey],
      debounceWait: 300,
    },
  );

  const { data: repositoryDict, loading } = useRequest(
    async () => {
      if (!hasArrayItem(repositoryData)) return null;
      return handleRepoPath(getRepoData(repositoryData)).reduce((prev, cur) => {
        if (cur.objectId) {
          prev[cur.objectId] = cur.path;
        }
        return prev;
      }, {});
    },
    {
      cacheKey: `repository_data_${folderKey}`,
      refreshDeps: [repositoryData, folderKey],
    },
  );

  React.useEffect(() => {
    return repositoryFolderTreeEvent.register(() => {
      refreshRepositoryData();
    });
  }, [refreshRepositoryData]);

  const data = repositoryDict?.[rowData?.repository ?? ''] ?? '未分组';

  return { data, loading };
};

export const useGetUserNameByName = (name: string) => {
  const { data } = useRequest(
    async () => {
      if (!name) return null;

      const [userInfo] = await new Parse.Query(Parse.User).containedIn('username', [name]).find();

      return userInfo.toJSON().nickname;
    },
    {
      cacheKey: `executor${name ?? ''}`,
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  return data;
};

/** 获取所有的测试管理配置 */
export const useAllTestConfigs = (
  selectedFields = ['itemTypeMap', 'defectsMapping', 'workspaceKey'],
) => {
  const { data: testConfigs } = useRequest(async () => getAllTestConfigs(selectedFields), {
    cacheTime: 99999999999,
    staleTime: 99999999999,
    cacheKey: 'allTestConfigs',
  });

  return testConfigs;
};

/** 获取测试管理类型关联的类型 */
export const useTestTypeUsedItemTypes = () => {
  const testConfigs = useAllTestConfigs();

  return React.useMemo(() => {
    const transformResult = (data: Record<string, Set<unknown>>) => {
      const results = {} as Record<TestType, string[]>;
      for (const [key, set] of Object.entries(data)) {
        results[key] = Array.from(set);
      }
      return results;
    };
    const testTypeUsedItemTypes = {
      [TestType.Case]: new Set(),
      [TestType.Plan]: new Set(),
      [TestType.Execution]: new Set(),
    };

    if (!testConfigs) return transformResult(testTypeUsedItemTypes);
    const testConfigData = testConfigs.map(item => item.toJSON());

    testConfigData.forEach(data => {
      Object.keys(testTypeUsedItemTypes).forEach(key => {
        const itemTypeKey = data?.itemTypeMap?.[key];
        itemTypeKey && testTypeUsedItemTypes[key].add(itemTypeKey);
      });
    });

    return transformResult(testTypeUsedItemTypes);
  }, [testConfigs]);
}; // 测试人员仅可执行自己的测试用例

/** 获取测试执行操作权限 */
export const useTestRunActionAuth = ({ workspaceKey }) => {
  const testConfig = useWorkspaceTestConfig(workspaceKey);
  const currentUser = useCurrentUser();

  const testRunAction = testConfig?.testRunAction ?? {};

  return {
    canAssignTestRun: useMemoizedFn(() => {
      const { authUserList } = testRunAction;
      // 当没有设置分配人时，所有人都可以分配执行人
      const noAuthUser = !Array.isArray(authUserList) || authUserList.length === 0;
      if (noAuthUser) return true;
      // 当前登录用户再授权用户列表中可以分配用户
      return authUserList.some(user => user.username === currentUser.username);
    }),
    canExecuteTestRun: useMemoizedFn(designee => {
      const getCannotExecuteMessage = () => {
        if (testRunAction.canOnlyExecuteMineCase && !testRunAction.canOnlyExecuteAssignedCase) {
          if (!Array.isArray(designee) || designee.length === 0) return;
          const notInDesignee = !designee.some(u => u.objectId === currentUser.objectId);
          if (notInDesignee) return '无法执行指派给他人的测试用例';
        }

        if (testRunAction.canOnlyExecuteMineCase && testRunAction.canOnlyExecuteAssignedCase) {
          if (!Array.isArray(designee) || designee.length === 0)
            return '当前测试用例未分配执行人，无法执行';
          const notInDesignee = !designee.some(u => u.objectId === currentUser.objectId);
          if (notInDesignee) return '无法执行指派给他人的测试用例';
        }
      };
      const message = getCannotExecuteMessage();

      return {
        message,
        result: !message,
      };
    }),
  };
};

/** 获取可执行的测试执行 id  */
export const useCanExecuteTestRunIdSequence = params => {
  const { workspaceKey, idSequence } = params;
  const testConfig = useWorkspaceTestConfig(workspaceKey);
  const currentUser = useCurrentUser();

  const getCanExecuteTestRunIdSequence = useMemoizedFn(async sequence => {
    const testRunAction = testConfig?.testRunAction ?? {};
    let selector = null;
    if (testRunAction.canOnlyExecuteMineCase && testRunAction.canOnlyExecuteAssignedCase) {
      selector = `${BuiltinFieldNameMapping.designee} = '${currentUser.username}'`;
    } else if (testRunAction.canOnlyExecuteMineCase) {
      selector = `${BuiltinFieldNameMapping.designee} = '${currentUser.username}' or ${BuiltinFieldNameMapping.designee} is null`;
    } else {
      return sequence;
    }

    const { list } = await getTestEntityByQuery({
      query: {
        id: sequence,
        type: TestType.Run,
      },
      selector,
      onlySelectId: true,
    });

    return list;
  });

  const { data } = useRequest(() => getCanExecuteTestRunIdSequence(idSequence), {
    ready:
      Boolean(testConfig) &&
      Boolean(currentUser) &&
      Array.isArray(idSequence) &&
      idSequence.length > 0,
    refreshDeps: [idSequence],
  });

  return { canExecuteTestRunIdSequence: data, getCanExecuteTestRunIdSequence };
};
