import React from 'react';
import { useRequest } from 'ahooks';
import { pick } from 'lodash';
import { openCreateItemModal, openItemDetailPanel } from '@/lib/api/sdk';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import { getTestConfig, createTestEntity, getTestEntity } from '@/lib/api/common';
import {
  TestConfigContext,
  TestConfigContextType,
  BaseActionContext,
  BaseActionContextType,
} from './context';

type RepositoryDataProviderProps = Pick<TestConfigContextType, 'workspaceId'> & {
  children: React.ReactNode;
};

const TestManagerProvider: React.FC<RepositoryDataProviderProps> = ({
  children,
  workspaceId: workspaceIdProp,
}) => {
  const [workspaceId, setWorkspaceId] = React.useState<string>();

  React.useEffect(() => {
    setWorkspaceId(workspaceIdProp);
  }, [workspaceIdProp]);

  const { data: testConfig } = useRequest(() => getTestConfig(workspaceId), {
    staleTime: 50000,
    ready: !!workspaceId,
    cacheKey: workspaceId,
    refreshDeps: [workspaceId],
  });

  /** 事项创建成功回调 */
  const itemCreateSuccessCb = React.useCallback(params => {
    console.info('itemCreateSuccessCb', params);
    const testEntity = getTestEntity(params.itemId);
    if (!testEntity) {
      createTestEntity({
        itemId: params.itemId,
        type: params.extraData.type,
        workspaceId: params.workspaceId,
      });
    }

    // TODO: item link
  }, []);

  useOnItemCreateSuccess(itemCreateSuccessCb);

  /** 测试关联类型 */
  const itemTypeMap = React.useMemo(() => {
    return (pick(testConfig?.toJSON() ?? {}, ['itemTypeMap']) ||
      {}) as TestConfigContextType['config']['itemTypeMap'];
  }, [testConfig]);

  const testConfigContextValues = React.useMemo<TestConfigContextType>(() => {
    return {
      // TODO: fetch config
      config: {
        itemTypeMap,
      },
      workspaceId,
      setWorkspaceId,
    };
  }, [workspaceId, itemTypeMap]);

  const baseActionContextValues = React.useMemo(() => {
    const actions: BaseActionContextType = {
      getTestEntity(itemId) {
        return getTestEntity(itemId);
      },
      createItem(params) {
        const { extraData, type } = params;
        const itemTypeId = itemTypeMap[type];
        // 打开创建弹窗
        openCreateItemModal({
          itemTypeId,
          workspaceId,
          extraData: extraData ?? {
            type,
            workspaceId,
          },
        });
      },
      openItemViewPanel(itemId) {
        openItemDetailPanel(itemId);
      },
    };

    return actions;
  }, [itemTypeMap, workspaceId]);

  return (
    <TestConfigContext.Provider value={testConfigContextValues}>
      <BaseActionContext.Provider value={baseActionContextValues}>
        {children}
      </BaseActionContext.Provider>
    </TestConfigContext.Provider>
  );
};

export default React.memo(TestManagerProvider);
