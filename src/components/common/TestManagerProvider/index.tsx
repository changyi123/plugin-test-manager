import React from 'react';
import { notification } from '@osui/ui';
import { useRequest } from 'ahooks';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import { openCreateItemModal, openItemDetailPanel } from '@/lib/api/sdk';
import { getTestConfig, createTestEntities, getTestEntityByItemId } from '@/lib/api/common';
import { getItemByIQL, getWorkspaceByKey } from '@/lib/api/proxima';
import { useEventBusContextValue } from './hooks';
import {
  TestConfigContext,
  TestConfigContextType,
  BaseActionContext,
  BaseActionContextType,
  EventBusContext,
} from './context';

type RepositoryDataProviderProps = {
  workspaceKey?: string;
  children: React.ReactNode;
};

const TestManagerProvider: React.FC<RepositoryDataProviderProps> = ({ children, workspaceKey }) => {
  const [workspaceId, setWorkspaceId] = React.useState<string>();
  const eventBusValues = useEventBusContextValue();

  React.useEffect(() => {
    const execute = async () => {
      const { objectId } = await getWorkspaceByKey(workspaceKey);
      setWorkspaceId(objectId);
    };
    execute();
  }, [workspaceKey]);

  const { data: testConfigParseObj } = useRequest(() => getTestConfig(workspaceKey), {
    staleTime: 50000,
    ready: !!workspaceId,
    cacheKey: workspaceId,
    refreshDeps: [workspaceId],
  });

  /** 测试关联类型 */
  const testConfig = React.useMemo(() => {
    return (testConfigParseObj?.toJSON() ?? {}) as TestConfigContextType['config'];
  }, [testConfigParseObj]);

  /** 事项创建成功回调 */
  const itemCreateSuccessCb = React.useCallback(
    async params => {
      // 获取 item 数据
      const {
        items: [item],
      } = await getItemByIQL({ itemId: params.itemId });
      const { key, workspace, itemType } = item ?? ({} as any);
      // 测试类型关联的事项类型
      let workspaceItemTypeMap = testConfig?.itemTypeMap;
      // 测试实体类型
      const testEntityType = params.extraData.type;
      // 判断测试类型关联的事项类型是否正确
      const isRightTestEntityType = itemTypeMap => {
        // 对比 key
        return Object.entries(itemTypeMap ?? {}).some(([testType, itemTypeKey]) => {
          return testType === testEntityType && itemTypeKey === itemType?.key;
        });
      };

      if (workspaceKey !== workspace.key) {
        // 事项所属空间不是当前空间则需要 testConfig itemTypeMap 关联类型
        const otherTestConfig = getTestConfig(workspace.key);
        workspaceItemTypeMap = otherTestConfig?.itemTypeMap;
      }

      if (!isRightTestEntityType(workspaceItemTypeMap)) {
        return notification.open({
          message: '提示',
          description: '事项所属空间未配置测试管理关联类型',
        });
      }
      // 如果没有相关联的类型，则放弃创建测试实体
      const testEntity = await getTestEntityByItemId(params.itemId);
      if (!testEntity) {
        await createTestEntities([
          {
            itemId: item.id,
            type: testEntityType,
            workspaceKey: workspace.key,
          },
        ]);
      }
      eventBusValues.itemCreated$.emit({
        itemKey: key,
        ...params.extraData,
      });
      // TODO: item link
    },
    [eventBusValues.itemCreated$, testConfig?.itemTypeMap, workspaceKey],
  );

  useOnItemCreateSuccess(itemCreateSuccessCb);

  const testConfigContextValues = React.useMemo<TestConfigContextType>(() => {
    return {
      // TODO: fetch config
      config: {
        itemTypeMap: testConfig.itemTypeMap,
      },
      workspaceKey,
      setWorkspaceId,
    };
  }, [workspaceKey, testConfig]);

  const baseActionContextValues = React.useMemo(() => {
    const actions: BaseActionContextType = {
      getTestEntity(itemId) {
        return getTestEntityByItemId(itemId);
      },
      createItem(params) {
        const { extraData, type } = params;
        const itemTypeId = testConfig?.itemTypeMap?.[type];
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
  }, [testConfig?.itemTypeMap, workspaceId]);

  return (
    <EventBusContext.Provider value={eventBusValues}>
      <TestConfigContext.Provider value={testConfigContextValues}>
        <BaseActionContext.Provider value={baseActionContextValues}>
          {children}
        </BaseActionContext.Provider>
      </TestConfigContext.Provider>
    </EventBusContext.Provider>
  );
};

export default React.memo(TestManagerProvider);
