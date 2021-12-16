import React from 'react';
import { useRequest } from 'ahooks';
import { notification } from '@osui/ui';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import { openCreateItemModal, openItemDetailPanel } from '@/lib/api/sdk';
import { getTestConfig, createTestEntities, getTestEntityByItemId } from '@/lib/api/common';
import { getItemByIQL, getWorkspaceByKey, getItemTypeByKey } from '@/lib/api/proxima';
import { useEventBusContextValue } from './hooks';
import { Workspace, Item } from '@/lib/types/App';
import { TestEntity } from '@/lib/types/Test';
import { getKeyByValue } from '@/lib/utils/helper';
import {
  TestConfigContext,
  TestConfigContextType,
  BaseActionContext,
  BaseActionContextType,
  EventBusContext,
} from './context';
import { TestType } from '@/lib/constants';

/** 获取测试实体，如果不存在创建 */
const getOrCreateTestEntity = async (itemId: string, config?: { notice: boolean }) => {
  if (!itemId) return null;
  let testEntity = await getTestEntityByItemId(itemId);

  // 查询不到测试实体则直接创建
  if (!testEntity) {
    const {
      items: [item],
    } = await getItemByIQL({ itemId });

    const testConfig = await getTestConfig(item?.workspace?.key);
    const itemTypeMap = testConfig?.get('itemTypeMap');

    if (itemTypeMap) {
      const testType = getKeyByValue(itemTypeMap, item.itemType.key) as TestType;
      // 创建失败，通知用户无法创建测试实体
      if (!testType) {
        // 创建失败，通知用户无法创建测试实体
        config?.notice === true &&
          notification.open({
            message: '提示',
            description: '事项所属空间未配置测试管理关联类型',
          });
        return null;
      }
      await createTestEntities([
        {
          itemId: item.id,
          type: testType,
          workspaceKey: item?.workspace?.key,
        },
      ]);
      // 重新查询 testEntity，保持返回数据一致
      testEntity = await getTestEntityByItemId(itemId);
      console.info('new testEntity', testEntity.toJSON());
    }
  }

  return testEntity;
};

type RepositoryDataProviderProps = {
  itemId?: string;
  workspaceKey?: string;
  children: React.ReactNode;
};

const TestManagerProvider: React.FC<RepositoryDataProviderProps> = ({
  itemId,
  children,
  workspaceKey,
}) => {
  // const [item, setItem] = React.useState<Item>();
  const [workspace, setWorkspace] = React.useState<Workspace>();
  const [testEntity, setTestEntity] = React.useState<Parse.Object<TestEntity>>();

  const eventBusValues = useEventBusContextValue();

  React.useEffect(() => {
    const execute = async () => {
      if (!workspaceKey) return;
      const workspace = await getWorkspaceByKey(workspaceKey);
      setWorkspace(workspace);
    };
    execute();
  }, [workspaceKey]);

  React.useEffect(() => {
    const execute = async () => {
      const testEntity = await getOrCreateTestEntity(itemId);
      if (testEntity) {
        setTestEntity(testEntity);
        const workspace = testEntity.get('reference')?.get('workspace');
        workspace && setWorkspace(workspace);
      }
    };
    execute();
  }, [itemId]);

  const { data: testConfigParseObj } = useRequest(() => getTestConfig(workspaceKey), {
    staleTime: 50000,
    ready: !!workspace,
    cacheKey: workspaceKey + workspace?.key,
    refreshDeps: [workspaceKey, workspace?.key],
  });

  /** 测试关联类型 */
  const testConfig = React.useMemo(() => {
    return (testConfigParseObj?.toJSON() ?? {}) as TestConfigContextType['config'];
  }, [testConfigParseObj]);

  // 事项创建成功回调
  const itemCreateSuccessCb = React.useCallback(
    async params => {
      // FIXME: 优化创建流程
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
      // item,
      workspace,
      testEntity,
    };
  }, [testConfig.itemTypeMap, workspace, testEntity]);

  const baseActionContextValues = React.useMemo(() => {
    const actions: BaseActionContextType = {
      getTestEntity(itemId) {
        return getTestEntityByItemId(itemId);
      },
      async createItemUseModal(params) {
        const { extraData, type } = params;
        const itemTypeKey = testConfig?.itemTypeMap?.[type];

        const itemType = await getItemTypeByKey(itemTypeKey);
        if (!itemType?.objectId) return;

        // 打开创建弹窗
        openCreateItemModal({
          itemTypeId: itemType?.objectId,
          workspaceId: workspace?.objectId,
          extraData: extraData ?? {
            type,
            workspaceId: workspace?.objectId,
          },
        });
      },
      openItemViewPanel: openItemDetailPanel,
    };

    return actions;
  }, [testConfig?.itemTypeMap, workspace?.objectId]);

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
