import React from 'react';
import { v4 as uuid } from 'uuid';
import { useRequest } from 'ahooks';
import { store } from '@nebulare/data';
import { alert } from '@/lib/utils/helper';
import { Workspace } from '@/lib/types/App';
import { TestEntity } from '@/lib/types/Test';
import { EventBus } from '@/lib/utils/eventBus';
import { message, notification } from 'antd';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import { openCreateItemModal, openItemDetailPanel } from '@/lib/api/sdk';
import { getTestConfig, createTestEntities, getTestEntities } from '@/lib/api/common';
import { getItemByIds, getWorkspaceByKey, getItemTypeByKey } from '@/lib/api/proxima';
import { getKeyByValue, generateSortIndex } from '@/lib/utils/helper';
import {
  TestConfigContext,
  BaseActionContext,
  TestConfigContextType,
  BaseActionContextType,
} from './context';
import {
  TestType,
  ENTITY_NOT_FOUND,
  ExtensionValType,
  CREATE_ITEM_STORE_FIELD_KEY,
} from '@/lib/constants';

const ItemCreateSuccessEventType = 'itemCreateSuccess';

/** 获取测试实体，如果不存在创建 */
const getOrCreateTestEntity = async (
  itemId: string,
  options?: { repository?: string | null; fields: Record<string, any>; notice: boolean },
) => {
  if (!itemId) return null;
  const storeValues = store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM);
  let [testEntity] = await getTestEntities({ itemId });

  // 查询不到测试实体则直接创建
  if (!testEntity) {
    const [item] = await getItemByIds([itemId]);

    const testConfig = await getTestConfig({
      workspaceKey: item?.workspace?.key,
    });
    const itemTypeMap = testConfig?.get('itemTypeMap');

    if (itemTypeMap) {
      const testType = getKeyByValue(itemTypeMap, item?.itemType.key) as TestType;
      // 额外需要创建的字段
      let extraFields = {};
      // 测试用例所属模块字段
      let repository = options?.repository;

      if (!testType) {
        // 创建失败，通知用户无法创建测试实体
        options?.notice === true &&
          notification.open({
            message: '提示',
            description: '事项所属空间未配置测试管理关联类型',
          });
        return null;
      }

      // 测试用例创建
      if (testType === TestType.TestDetail) {
        // 测试用例创建时需要生成默认 sortIndex
        extraFields = {
          ...extraFields,
          sortIndex: generateSortIndex(),
        };
        // 添加事项创建 panel 的数据
        if (storeValues?.[CREATE_ITEM_STORE_FIELD_KEY]) {
          const { repository: storedRepository, ...detail } =
            storeValues[CREATE_ITEM_STORE_FIELD_KEY];

          repository = storedRepository;
          extraFields = {
            ...extraFields,
            detail,
          };
        }
        console.info('extraFields', extraFields);
      }

      await createTestEntities([
        {
          repository,
          type: testType,
          fields: extraFields,
          itemId: item.objectId,
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

const eventBus = new EventBus();
// 消息 key，区分消息源。防止多个消息同时被接收
const messageKey = ItemCreateSuccessEventType + uuid();

const TestManagerProvider: React.FC<RepositoryDataProviderProps> = ({
  itemId,
  children,
  workspaceKey,
}) => {
  const [workspace, setWorkspace] = React.useState<Workspace>();
  const [testEntity, setTestEntity] = React.useState<Parse.Object<TestEntity>>();

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
      setTestEntity(testEntity ?? ENTITY_NOT_FOUND);
      if (testEntity) {
        const workspace = testEntity.get('reference')?.get('workspace');
        workspace && setWorkspace(workspace.toJSON());
      }
    };
    execute();
  }, [itemId]);

  const { data: testConfigParseObj } = useRequest(
    () =>
      getTestConfig({
        workspaceKey: workspaceKey ?? workspace?.key,
      }),
    {
      staleTime: 50000,
      ready: !!workspace,
      cacheKey: workspaceKey + workspace?.key,
      refreshDeps: [workspaceKey, workspace?.key],
    },
  );

  // 获取全局配置时使用缓存
  const { runAsync: getGlobalConfig } = useRequest(
    async () => {
      const testConfig = await getTestConfig({
        global: true,
      });

      return testConfig?.get('extra') ?? { statuses: [] };
    },
    {
      // manual: true,
      cacheKey: 'GLOBAL_TEST_CONFIG',
      // 永不过期
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  /** 测试关联类型 */
  const testConfig = React.useMemo(() => {
    return (testConfigParseObj?.toJSON() ?? {}) as TestConfigContextType['config'];
  }, [testConfigParseObj]);

  // 事项创建成功回调
  const itemCreateSuccessCb = React.useCallback(
    async params => {
      // 缺陷类型不需要创建测试实体
      const { extraData } = params;

      const [itemData] = await getItemByIds([params.itemId]);
      let testEntity = null;

      // 禁止创建或或关联（当又空间隔离配置时且当前空间和事项创建空间不相同时）
      const disabledCreateOrRelation =
        testConfig.isolateTestType?.includes(extraData.type) &&
        workspace.key !== itemData.workspace?.key;

      if (disabledCreateOrRelation) return;

      // 缺陷类型不需要创建测试管理测试实体
      if (extraData.type !== TestType.TestDefect) {
        testEntity = await getOrCreateTestEntity(params.itemId, {
          repository: extraData?.repository,
          fields: extraData.fields,
          notice: true,
        });
        const testEntityData = testEntity?.toJSON();
        if (!testEntityData) return;
        itemData.reference = testEntityData.reference;
      }
      eventBus.dispatch(messageKey, {
        extraData,
        testEntity,
        item: itemData,
      });
    },
    [testConfig.isolateTestType, workspace?.key],
  );

  useOnItemCreateSuccess(messageKey, itemCreateSuccessCb);

  const testConfigContextValues = React.useMemo<TestConfigContextType>(() => {
    return {
      // TODO: fetch config
      config: {
        itemTypeMap: testConfig.itemTypeMap,
        defectsMapping: testConfig.defectsMapping,
        isolateTestType: testConfig.isolateTestType,
      },
      // item,
      workspace,
      testEntity,
    };
  }, [
    testConfig.itemTypeMap,
    testConfig.defectsMapping,
    testConfig.isolateTestType,
    workspace,
    testEntity,
  ]);

  const baseActionContextValues = React.useMemo(() => {
    const actions: BaseActionContextType = {
      async createItemUseModal(params) {
        const { extraData, type, name, hideMessage } = params;
        let itemTypeKey = testConfig?.itemTypeMap?.[type] as string;
        // 获取缺陷事项类型 key
        if (type === TestType.TestDefect) {
          itemTypeKey = testConfig.defectsMapping?.[0];
        }

        const itemType = await getItemTypeByKey(itemTypeKey ?? '');

        // TODO: 通知统一处理！
        if (!itemType?.objectId) {
          // notification.open({
          //   message: '提示',
          //   description: '所属空间无法创建实体，请选择其他空间事项创建',
          // });
          // FIXME: 修改
          message.warning('所属空间无法创建实体，请选择其他空间事项创建');
        }

        // 打开创建弹窗
        openCreateItemModal({
          name: name ?? '',
          itemTypeId: itemType?.objectId,
          workspaceId: workspace?.objectId,
          extraData: Object.assign(
            {
              hideMessage: hideMessage ?? true,
              type,
              workspaceId: workspace?.objectId,
              messageKey: messageKey,
            },
            extraData,
          ),
        });

        // 清除事件监听
        eventBus.disposer();
        // 事项创建成功通知
        return new Promise((resolve, reject) => {
          eventBus.disposer = eventBus.register(messageKey, data => {
            const { testEntity, item } = data;
            // 创建的测试类型是否符合预期
            let expectedTestType = testEntity?.get('type') === type;

            // 判断事项类型 key 是否在 defectsMapping 中
            if (type === TestType.TestDefect) {
              expectedTestType = (testConfig?.defectsMapping ?? []).includes(item?.itemType?.key);
            }

            // TODO: 消息通知
            if (!expectedTestType) {
              alert({
                type: 'warning',
                message: '新建事项类型与创建的测试类型未匹配',
              });
              reject('新建事项类型与创建的测试类型未匹配');
              return;
            }
            resolve(data);
          });
        });
      },
      getGlobalConfig,
      openItemViewPanel: openItemDetailPanel,
    };

    return actions;
  }, [getGlobalConfig, testConfig.defectsMapping, testConfig?.itemTypeMap, workspace?.objectId]);

  return (
    <TestConfigContext.Provider value={testConfigContextValues}>
      <BaseActionContext.Provider value={baseActionContextValues}>
        {children}
      </BaseActionContext.Provider>
    </TestConfigContext.Provider>
  );
};

export default React.memo(TestManagerProvider);
