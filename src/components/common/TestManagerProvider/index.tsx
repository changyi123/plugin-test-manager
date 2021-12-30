import React from 'react';
import { useRequest } from 'ahooks';
import { notification } from '@osui/ui';
import { EventBus } from '@/lib/utils/eventBus';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import { openCreateItemModal, openItemDetailPanel } from '@/lib/api/sdk';
import { getTestConfig, createTestEntities, getTestEntities } from '@/lib/api/common';
import { getItemByIQL, getWorkspaceByKey, getItemTypeByKey } from '@/lib/api/proxima';
import { Workspace } from '@/lib/types/App';
import { TestEntity } from '@/lib/types/Test';
import { getKeyByValue } from '@/lib/utils/helper';
import { alert } from '@/lib/utils/helper';
import {
  TestConfigContext,
  TestConfigContextType,
  BaseActionContext,
  BaseActionContextType,
} from './context';
import { TestType } from '@/lib/constants';

const ItemCreateSuccessEventType = 'itemCreateSuccess';

/** 获取测试实体，如果不存在创建 */
const getOrCreateTestEntity = async (itemId: string, config?: { notice: boolean }) => {
  if (!itemId) return null;
  let [testEntity] = await getTestEntities({ itemId });

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
      [testEntity] = await getTestEntities({ itemId });
      console.info('new testEntity', testEntity?.toJSON());
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
  const [workspace, setWorkspace] = React.useState<Workspace>();
  const [testEntity, setTestEntity] = React.useState<Parse.Object<TestEntity>>();

  // 事项创建成功 Emitter
  const eventBusRef = React.useRef<any>(new EventBus());
  React.useEffect(() => {
    const eventBus = eventBusRef.current;
    return () => {
      typeof eventBus?.disposer === 'function' && eventBus.disposer();
    };
  }, []);

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
        workspace && setWorkspace(workspace.toJSON());
      }
    };
    execute();
  }, [itemId]);

  const { data: testConfigParseObj } = useRequest(
    () => getTestConfig(workspaceKey ?? workspace?.key),
    {
      staleTime: 50000,
      ready: !!workspace,
      cacheKey: workspaceKey + workspace?.key,
      refreshDeps: [workspaceKey, workspace?.key],
    },
  );

  /** 测试关联类型 */
  const testConfig = React.useMemo(() => {
    return (testConfigParseObj?.toJSON() ?? {}) as TestConfigContextType['config'];
  }, [testConfigParseObj]);

  // 事项创建成功回调
  const itemCreateSuccessCb = React.useCallback(async params => {
    // 缺陷类型不需要创建测试实体
    const { extraData } = params;

    let itemData = null;
    let testEntity = null;

    // 缺陷类型不需要创建测试管理测试实体
    if (extraData.type === TestType.TestDefect) {
      [itemData] = await getItemByIQL({ itemId: params.itemId });
    } else {
      testEntity = await getOrCreateTestEntity(params.itemId, { notice: true });
      const testEntityData = testEntity?.toJSON();
      if (!testEntityData) return;
      itemData.reference = testEntityData.reference;
    }

    eventBusRef.current.dispatch(ItemCreateSuccessEventType, {
      extraData,
      testEntity,
      item: itemData,
    });
  }, []);
  useOnItemCreateSuccess(itemCreateSuccessCb);

  const testConfigContextValues = React.useMemo<TestConfigContextType>(() => {
    return {
      // TODO: fetch config
      config: {
        itemTypeMap: testConfig.itemTypeMap,
        defectsMapping: testConfig.defectsMapping,
      },
      // item,
      workspace,
      testEntity,
    };
  }, [testConfig.itemTypeMap, testConfig.defectsMapping, workspace, testEntity]);

  const baseActionContextValues = React.useMemo(() => {
    const actions: BaseActionContextType = {
      async createItemUseModal(params) {
        const { extraData, type, name } = params;
        let itemTypeKey = testConfig?.itemTypeMap?.[type] as string;

        // 获取缺陷事项类型 key
        if (type === TestType.TestDefect) {
          itemTypeKey = testConfig.defectsMapping?.[0];
        }

        const itemType = await getItemTypeByKey(itemTypeKey ?? '');

        // TODO: 通知统一处理！
        if (!itemType?.objectId) {
          notification.open({
            message: '提示',
            description: '所属空间无法创建实体，请选择其他空间事项创建',
          });
        }

        // 打开创建弹窗
        openCreateItemModal({
          name: name ?? '',
          itemTypeId: itemType?.objectId,
          workspaceId: workspace?.objectId,
          extraData: extraData ?? {
            type,
            workspaceId: workspace?.objectId,
          },
        });

        // 事项创建成功通知
        return new Promise((resolve, reject) => {
          eventBusRef.current.disposer = eventBusRef.current.register(
            ItemCreateSuccessEventType,
            data => {
              const { testEntity, item } = data;

              // 创建的测试类型是否符合预期
              let expectedTestType = testEntity?.get('type') === type;

              // 判断事项类型 key 是否在 defectsMapping 中
              if (type === TestType.TestDefect) {
                expectedTestType = (testConfig?.defectsMapping ?? []).includes(item?.itemType?.key);
              }

              // 通知
              alert({
                type: 'warning',
                message: '新建事项类型与创建的测试类型未匹配',
              });

              // TODO: 消息通知
              if (!expectedTestType) return reject('新建事项类型与创建的测试类型未匹配');
              resolve(data);
            },
          );
        });
      },
      openItemViewPanel: openItemDetailPanel,
    };

    return actions;
  }, [testConfig?.defectsMapping, testConfig?.itemTypeMap, workspace?.objectId]);

  return (
    <TestConfigContext.Provider value={testConfigContextValues}>
      <BaseActionContext.Provider value={baseActionContextValues}>
        {children}
      </BaseActionContext.Provider>
    </TestConfigContext.Provider>
  );
};

export default React.memo(TestManagerProvider);
