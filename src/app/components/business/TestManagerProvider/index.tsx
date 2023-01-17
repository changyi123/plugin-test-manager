import React from 'react';
import { v4 as uuid } from 'uuid';
import { useRequest } from 'ahooks';
import { store } from '@nebulare/data';
import { Workspace } from '@/lib/types/App';
import { TestEntity } from '@/lib/types/Test';
import { EventBus } from '@/lib/utils/eventBus';
import { message, notification } from 'antd';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import { openCreateItemModal, openItemDetailPanel } from '@/lib/api/sdk';
import { getTestConfig, getTestConfigByWorkspaceKeys } from '@/lib/api/common';
import { getItemByIds, getWorkspaceByKey, getItemTypeByKey } from '@/lib/api/proxima';
import { getKeyByValue, generateSortIndex, alert, hasArrayItem } from '@/lib/utils/helper';
import {
  TestConfigContext,
  BaseActionContext,
  TestConfigContextType,
  BaseActionContextType,
} from './context';
import {
  ENTITY_NOT_FOUND,
  ExtensionValType,
  CREATE_ITEM_STORE_FIELD_KEY,
  TestType,
} from '@/lib/constants';
import { getTestEntityByQuery, updateTestEntity } from '@/lib/api/item';
import { union } from 'lodash';
import { useGetPermissions } from './hooks';

const ItemCreateSuccessEventType = 'itemCreateSuccess';
const DefaultTestConfig = {} as TestConfigContextType['config'];

/** 获取测试实体，如果不存在创建 */
const getOrCreateTestEntity = async (
  itemId: string,
  options?: {
    repository?: string | null;
    fields?: Record<string, any>;
    itemData?: Record<string, any>;
    type?: string;
    notice?: boolean;
  },
  preparedData?: {
    itemTypeMap?: Record<string, any>;
  },
) => {
  if (!itemId) return null;
  let testEntity;
  const { itemData, type } = options;
  const storeValues = store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM);

  let itemTypeMap = preparedData?.itemTypeMap;
  if (!itemTypeMap) {
    const testConfig = await getTestConfig({
      workspaceKey: itemData?.workspace?.key,
    });
    itemTypeMap = testConfig?.get('itemTypeMap');
  }

  if (itemTypeMap) {
    let needCreatedItem = {};
    const testType = getKeyByValue(itemTypeMap, itemData?.itemType.key) as TestType;
    // 额外需要创建的字段
    let extraFields = {};
    if (!testType) {
      // 创建失败，通知用户无法创建测试实体
      options?.notice === true &&
        notification.warning({
          message: '提示',
          description: '事项所属空间未配置测试管理关联类型',
        });
      return null;
    }

    // 传入的类型和类型关联映射不一致不允许创建
    if (type && type !== testType) {
      notification.warning({
        message: '提示',
        description: '事项所属空间未配置测试管理关联类型',
      });
      return null;
    }

    // 测试用例创建
    if (testType === TestType.Case) {
      // 测试用例创建时需要生成默认 sortIndex
      extraFields = {
        ...extraFields,
      };

      // 添加事项创建 panel 的数据
      if (storeValues?.[CREATE_ITEM_STORE_FIELD_KEY]) {
        const { repository: storedRepository, ...detail } =
          storeValues[CREATE_ITEM_STORE_FIELD_KEY];

        needCreatedItem = {
          ...detail,
          repository: storedRepository,
        };
      }
      console.info('extraFields', extraFields);
    }
    const data = await updateTestEntity([
      {
        objectId: itemData.objectId,
        name: itemData.name,
        ...needCreatedItem,
        type: testType,
        sortIndex: generateSortIndex(1),
      },
    ]);
    if (data?.status === 'error') {
      message.error(data.data);
      return;
    }
    testEntity = data?.[0];
    console.info('new testEntity', testEntity);
    return testEntity;
  }
};

/** 获取并创建多个测试实体 */
const getOrBatchCreateTestEntities = async (
  itemIdList: string[],
  options?: {
    repository?: string | null;
    fields: Record<string, any>;
    itemList?: Record<string, any>[];
    storeValueList: Record<string, any>[];
    type: string;
    notice: boolean;
  },
) => {
  const { itemList, type } = options;
  if (!Array.isArray(itemIdList)) return null;

  // 批量获取无法保证顺序，所以需要重新排序
  const itemDataList = itemIdList.map(id => itemList.find(itemData => itemData.objectId === id));

  // 多空间 key
  const multipleWorkspaceKeys: string[] = union(
    itemDataList.map(itemData => itemData?.workspace?.key).filter(Boolean),
  );
  // 获取空间配置数据
  const testConfigs = await getTestConfigByWorkspaceKeys(multipleWorkspaceKeys);

  // 多空间类型映射配置
  const itemTypeMappingWorkspaceMap = testConfigs.reduce(
    (acc, cur) => ({
      ...acc,
      [cur.workspaceKey]: cur.itemTypeMap,
    }),
    {},
  );

  const curItemData = itemDataList.find(
    item => item.itemType.key === itemTypeMappingWorkspaceMap?.[item.workspace.key]?.[type],
  );

  const getItemType = (workspaceKey, itemTypeKey) => {
    const itemTypeMap = itemTypeMappingWorkspaceMap?.[workspaceKey] ?? {};

    const newItemTypeMap = Object.entries(itemTypeMap).reduce((prev, [key, value]) => {
      prev[value as string] = key;
      return prev;
    }, {});

    return newItemTypeMap?.[itemTypeKey];
  };

  // 根据 itemData 匹配测试实体类型
  const getMatchedTestType = itemData =>
    getKeyByValue(
      itemTypeMappingWorkspaceMap[itemData.workspace?.key],
      itemData.itemType?.key,
    ) as TestType;

  // 过滤事项关联和传入类型事项不一致的用例数据
  const itemMatchTestType = getMatchedTestType(curItemData);

  // 需要被创建测试实体的事项数据
  // 1. 和第一个事项对应的测试实体需要保持一致，不一致忽略创建
  // 2. 创建支持跨空间创建，不同空间对应不同的类型，需要对该逻辑进行处理
  const needCreatedItemDataList = itemDataList.filter(
    itemData => getMatchedTestType(itemData) === itemMatchTestType,
  );

  if (!itemMatchTestType) {
    // 创建失败，通知用户无法创建测试实体
    options?.notice === true &&
      notification.warning({
        message: '提示',
        description: '事项所属空间未配置测试管理关联类型',
      });
    return null;
  }

  const getItemStore = (list, index, field) => {
    if (index === 0) return {};
    const curStore = list[index]?.[CREATE_ITEM_STORE_FIELD_KEY];
    if (curStore) {
      if (curStore?.[field] || curStore?.[field] === null) {
        return {
          [field]: curStore?.[field],
        };
      }
    }

    const newList = list.slice(0, index).reverse();

    return newList.reduce((prev, cur) => {
      if (cur?.[CREATE_ITEM_STORE_FIELD_KEY]?.[field] && !prev?.[field]) {
        prev = {
          [field]: cur?.[CREATE_ITEM_STORE_FIELD_KEY]?.[field],
        };
      }
      return prev;
    }, {});
  };

  // 测试用例创建
  // 添加事项创建 panel 的数据
  const storeValueWithItemIdMap = (
    Array.isArray(options.storeValueList) ? options.storeValueList : []
  )
    .filter(Boolean)
    .reduce(
      (map, { itemId, ...restFields }, index) => ({
        ...map,
        [itemId]: {
          ...restFields[CREATE_ITEM_STORE_FIELD_KEY],
          ...getItemStore(options.storeValueList ?? [], index, 'repository'),
          ...getItemStore(options.storeValueList ?? [], index, 'precondition'),
          ...getItemStore(options.storeValueList ?? [], index, 'steps'),
        },
      }),
      {},
    );

  const needCreatedTestEntities = needCreatedItemDataList.map((item, index) => {
    const { repository, ...restFields } = storeValueWithItemIdMap[item.objectId] ?? {};
    const testType = getItemType(item.workspace.key, item.itemType.key);
    const extraFields =
      testType === TestType.Case
        ? {
            repository,
            detail: restFields,
          }
        : {};

    return {
      name: item.name,
      objectId: item.objectId,
      sortIndex: generateSortIndex(index + 1),
      type: getItemType(item.workspace.key, item.itemType.key),
      ...extraFields,
    };
  });
  const res = await updateTestEntity(needCreatedTestEntities);
  if (res?.status === 'error') {
    message.error(res.data);
    return;
  }
  return res;
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
  const [testEntity, setTestEntity] = React.useState<TestEntity>();

  const { getCreatePermission } = useGetPermissions(workspace);

  React.useEffect(() => {
    const execute = async () => {
      if (!workspaceKey) return;
      const workspace = await getWorkspaceByKey(workspaceKey);
      setWorkspace(workspace);
    };
    execute();
  }, [workspaceKey]);

  const { data: testConfig = DefaultTestConfig } = useRequest(
    async () => {
      const data = await getTestConfig({
        workspaceKey: workspaceKey ?? workspace?.key,
      });
      return data?.toJSON() as unknown as TestConfigContextType['config'];
    },
    {
      staleTime: 50000,
      ready: !!workspace,
      cacheKey: workspaceKey + workspace?.key,
      refreshDeps: [workspaceKey, workspace?.key],
    },
  );

  // 获取测试实体，如果不存在测试实体（类型映射如果和事项匹配）需要新建
  React.useEffect(() => {
    const execute = async () => {
      // 先获取事项详情
      let {
        list: [testEntity],
      } = await getTestEntityByQuery({
        query: {
          id: itemId,
        },
      });

      // 判断是否是测试实体
      const isTestEntity = testType => Object.values(TestType).includes(testType);

      if (!isTestEntity(testEntity?.type)) {
        // 不存在测试实体需要判断是否需要新建
        testEntity = await getOrCreateTestEntity(
          testEntity.objectId,
          {
            itemData: testEntity,
          },
          {
            itemTypeMap: testConfig.itemTypeMap,
          },
        );
      }

      const entity = (isTestEntity(testEntity?.type)
        ? testEntity
        : ENTITY_NOT_FOUND) as unknown as TestEntity;

      setTestEntity(entity);

      if (testEntity) {
        const workspace = testEntity.workspace;
        workspace && setWorkspace(workspace as Workspace);
      }
    };
    if (itemId && testConfig) {
      execute();
    }
  }, [itemId, testConfig]);

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

  // 事项创建成功回调
  const itemCreateSuccessCb = React.useCallback(
    async params => {
      // 缺陷类型不需要创建测试实体
      const { extraData } = params;

      if (extraData?.useItemBatchCreate) return;

      const [itemData] = await getItemByIds([params.itemId]);

      // 禁止创建或或关联（当又空间隔离配置时且当前空间和事项创建空间不相同时）
      const disabledCreateOrRelation =
        testConfig.isolateTestType?.includes(extraData.type) &&
        workspace.key !== itemData.workspace?.key;

      if (disabledCreateOrRelation) return;
      let testEntity;

      // 缺陷类型不需要创建测试管理测试实体
      if (extraData.type !== TestType.TestDefect) {
        testEntity = await getOrCreateTestEntity(params.itemId, {
          repository: extraData?.repository,
          fields: extraData.fields,
          itemData,
          type: extraData.type,
          notice: true,
        });
      }
      eventBus.dispatch(messageKey, {
        extraData,
        testEntity: testEntity,
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
      const { extraData, storeValueList, itemIdList } = params;
      if (!extraData?.useItemBatchCreate) return;

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

      if (isIsolated) {
        const itemsData = itemIdList
          .map(id => shuffledItemDataList.find(itemData => itemData.objectId === id))
          .filter(itemData => workspace.key !== itemData.workspace?.key);
        if (itemsData?.length) {
          notification.warning({
            message: '提示',
            description: '此空间已配置不可操作跨空间「事项类型」数据，非此空间事项保存失败',
          });
        }
      }

      if (!hasArrayItem(itemList)) return;
      // 缺陷类型不需要创建测试管理测试实体
      if (extraData.type !== TestType.TestDefect) {
        const testEntityList = await getOrBatchCreateTestEntities(
          itemList.map(d => d.objectId),
          {
            notice: true,
            storeValueList,
            itemList,
            fields: extraData.fields,
            type: extraData.type,
            repository: extraData?.repository,
          },
        );

        if (!hasArrayItem(testEntityList)) return;

        eventBus.dispatch(messageKey, {
          itemList,
          testEntityList,
          extraData,
          useItemBatchCreate: true,
        });
      }
    },
    [testConfig.isolateTestType, workspace?.key],
  );

  useOnItemCreateSuccess(messageKey, itemCreateSuccessCb, itemBatchCreateSuccessCb);

  const testConfigContextValues = React.useMemo(() => {
    return {
      // TODO: fetch config
      config: {
        itemTypeMap: testConfig.itemTypeMap,
        defectsMapping: testConfig.defectsMapping,
        isolateTestType: testConfig.isolateTestType,
        statuses: testConfig.statuses,
      },
      // item,
      workspace,
      testEntity,
      setTestEntity,
    };
  }, [
    testConfig.itemTypeMap,
    testConfig.defectsMapping,
    testConfig.isolateTestType,
    testConfig.statuses,
    workspace,
    testEntity,
  ]);

  const baseActionContextValues = React.useMemo(() => {
    const actions: BaseActionContextType = {
      async createItemUseModal(params) {
        const { extraData, type, name, hideMessage } = params;
        let itemTypeKey = testConfig?.itemTypeMap?.[type] as string;
        // 获取缺陷类型 key
        if (type === TestType.TestDefect) {
          itemTypeKey = testConfig.defectsMapping?.[0];
        }

        const itemType = await getItemTypeByKey(itemTypeKey ?? '');

        // TODO: 通知统一处理！
        if (!itemType?.objectId) {
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
            const { testEntity, testEntityList, item, itemList, useItemBatchCreate } = data;
            const willValidateItem = useItemBatchCreate ? itemList[0] : item;
            const willValidateTestEntity = useItemBatchCreate ? testEntityList?.[0] : testEntity;

            // 创建的测试类型是否符合预期
            let expectedTestType = willValidateTestEntity?.type === type;

            // 判断类型 key 是否在 defectsMapping 中
            if (type === TestType.TestDefect) {
              expectedTestType = (testConfig?.defectsMapping ?? []).includes(
                willValidateItem?.itemType?.key,
              );
            }

            // TODO: 消息通知
            if (!expectedTestType) {
              alert({
                type: 'warning',
                message: '新建类型与创建的测试类型未匹配',
              });
              reject('新建类型与创建的测试类型未匹配');
              return;
            }

            resolve(data);
          });
        });
      },
      getGlobalConfig,
      openItemViewPanel: openItemDetailPanel,
      getCreatePermission,
    };

    return actions;
  }, [
    getGlobalConfig,
    getCreatePermission,
    testConfig.defectsMapping,
    testConfig?.itemTypeMap,
    workspace?.objectId,
  ]);

  return (
    <TestConfigContext.Provider value={testConfigContextValues as any}>
      <BaseActionContext.Provider value={baseActionContextValues}>
        {children}
      </BaseActionContext.Provider>
    </TestConfigContext.Provider>
  );
};

export default React.memo(TestManagerProvider);
