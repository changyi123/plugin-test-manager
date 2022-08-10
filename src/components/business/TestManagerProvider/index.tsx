import React from 'react';
import { v4 as uuid } from 'uuid';
import { useRequest } from 'ahooks';
import { store } from '@nebulare/data';
import { Workspace } from '@/lib/types/App';
import { TestEntity } from '@/lib/types/Test';
import { EventBus } from '@/lib/utils/eventBus';
import { message, notification } from 'antd';
import { alert, hasArrayItem } from '@/lib/utils/helper';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import { openCreateItemModal, openItemDetailPanel } from '@/lib/api/sdk';
import {
  getTestConfig,
  getTestEntities,
  createTestEntities,
  getTestConfigByWorkspaceKeys,
} from '@/lib/api/common';
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
import { union } from 'lodash';

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

/** 获取并创建多个测试实体 */
const getOrBatchCreateTestEntities = async (
  itemIdList: string[],
  options?: { repository?: string | null; fields: Record<string, any>; notice: boolean },
) => {
  if (!Array.isArray(itemIdList)) return null;
  const storeValues = store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM);
  let testEntities = await getTestEntities({ itemId: itemIdList });

  // 查询结果数量小于实际参数数量（事项不存在对应的测试管理实体数据）
  // 创建测试管理实体
  if (testEntities.length < itemIdList.length) {
    // 批量获取无法保证顺序，所以需要重新排序
    const shuffledItemDataList = await getItemByIds(itemIdList);
    const itemDataList = itemIdList.map(id =>
      shuffledItemDataList.find(itemData => itemData.objectId === id),
    );
    const firstItemData = itemDataList[0];
    // 第一项不存在则执行返回
    if (!firstItemData) return null;

    // 多空间 key
    const multipleWorkspaceKeys: string[] = union(
      itemDataList.map(itemData => itemData?.workspace?.key).filter(Boolean),
    );
    // 获取空间配置数据
    const testConfigs = await getTestConfigByWorkspaceKeys(multipleWorkspaceKeys);

    // 多空间事项类型映射配置
    const itemTypeMappingWorkspaceMap = testConfigs.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.workspaceKey]: cur.itemTypeMap,
      }),
      {},
    );

    // 根据 itemData 匹配测试实体类型
    const getMatchedTestType = itemData =>
      getKeyByValue(
        itemTypeMappingWorkspaceMap[itemData.workspace?.key],
        itemData.itemType?.key,
      ) as TestType;

    // 过滤事项关联和第一个不一致的用例数据
    const firstItemMatchTestType = getMatchedTestType(firstItemData);

    // 需要被创建测试实体的事项数据
    // 1. 和第一个事项对应的测试实体需要保持一致，不一致忽略创建
    // 2. 创建支持跨空间创建，不同空间对应不同的事项类型，需要对该逻辑进行处理
    const needCreatedItemDataList = itemDataList.filter(
      itemData => getMatchedTestType(itemData) === firstItemMatchTestType,
    );

    if (!firstItemMatchTestType) {
      // 创建失败，通知用户无法创建测试实体
      options?.notice === true &&
        notification.open({
          message: '提示',
          description: '事项所属空间未配置测试管理关联类型',
        });
      return null;
    }

    // 额外需要创建的字段
    let extraFields = {};
    // 测试用例所属模块字段
    let repository = options?.repository;

    // 测试用例创建
    if (firstItemMatchTestType === TestType.TestDetail) {
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

    const needCreatedTestEntities = needCreatedItemDataList.map((itemData, index) => {
      let fields = extraFields;
      // 测试用例创建时需要生成默认 sortIndex
      if (firstItemMatchTestType === TestType.TestDetail) {
        fields = {
          ...extraFields,
          sortIndex: generateSortIndex(index + 1),
        };
      }
      return {
        fields,
        repository,
        type: firstItemMatchTestType,
        itemId: itemData.objectId,
        workspaceKey: itemData.workspace?.key,
      };
    });

    await createTestEntities(needCreatedTestEntities);

    const itemId = needCreatedItemDataList.map(itemData => itemData.objectId);

    // 重新查询 testEntity，保持返回数据一致
    testEntities = await getTestEntities({ itemId });
    console.info(
      'new testEntity',
      testEntities?.map(item => item.toJSON()),
    );
  }

  return testEntities;
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

      if (extraData?.useItemBatchCreate) return;

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
        useItemBatchCreate: false,
      });
    },
    [testConfig.isolateTestType, workspace?.key],
  );

  // 事项批量创建成功回调
  const itemBatchCreateSuccessCb = React.useCallback(
    async params => {
      // 缺陷类型不需要创建测试实体
      const { extraData, itemIdList } = params;
      if (!extraData?.useItemBatchCreate) return;

      let testEntityList = [];
      const shuffledItemDataList = await getItemByIds(itemIdList);

      const isIsolated = testConfig.isolateTestType?.includes(extraData.type);

      const itemList = itemIdList
        // 批量查询，不能保证顺序，需要重新排序
        .map(id => shuffledItemDataList.find(itemData => itemData.objectId === id))
        // 禁止创建或或关联（当又空间隔离配置时且当前空间和事项创建空间不相同时）
        .filter(itemData => {
          // 测试隔离需要将非当前空间的事项给排除
          if (isIsolated) return workspace.key === itemData.workspace?.key;
          return true;
        });

      if (!hasArrayItem(itemList)) return;
      // 缺陷类型不需要创建测试管理测试实体
      if (extraData.type !== TestType.TestDefect) {
        const ids = itemList.map(itemData => itemData.objectId);
        testEntityList = await getOrBatchCreateTestEntities(ids, {
          repository: extraData?.repository,
          fields: extraData.fields,
          notice: true,
        });

        if (!hasArrayItem(testEntityList)) return;

        eventBus.dispatch(messageKey, {
          itemList,
          extraData,
          testEntityList,
          useItemBatchCreate: true,
        });
      }
    },
    [testConfig.isolateTestType, workspace?.key],
  );

  useOnItemCreateSuccess(messageKey, itemCreateSuccessCb, itemBatchCreateSuccessCb);

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
            const { testEntity, item, testEntityList, itemList, useItemBatchCreate } = data;
            const willValidateItem = useItemBatchCreate ? itemList[0] : item;
            const willValidateTestEntity = useItemBatchCreate ? testEntityList[0] : testEntity;

            // 创建的测试类型是否符合预期
            let expectedTestType = willValidateTestEntity?.get('type') === type;

            // 判断事项类型 key 是否在 defectsMapping 中
            if (type === TestType.TestDefect) {
              expectedTestType = (testConfig?.defectsMapping ?? []).includes(
                willValidateItem?.itemType?.key,
              );
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
