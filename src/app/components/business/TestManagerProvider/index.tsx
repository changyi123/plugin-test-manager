import { store } from '@nebulare/data';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useRequest } from 'ahooks';
import { message, notification, Spin } from 'antd';
import { isEmpty, union } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

import { useScreenFieldKeysFromTestConfig } from '@/components/common/BusinessTable/hook';
import { getGeneralSetting, getTestConfig, getTestConfigByWorkspaceKeys } from '@/lib/api/common';
import { getTestEntityByQuery, updateTestEntity } from '@/lib/api/item';
import { getItemByIds, getItemTypeByKey, getItemTypeByKeys } from '@/lib/api/proxima';
import { openCreateItemModal, openItemDetailPanel } from '@/lib/api/sdk';
import { judgeCaseSnapshot } from '@/lib/appEnv';
import { CREATE_ITEM_STORE_FIELD_KEY, ExtensionValType, TestType } from '@/lib/constants';
import { repositoryFolderTreeEvent } from '@/lib/events';
import useI18n from '@/lib/hooks/useI18n';
import { useOnItemCreateSuccess } from '@/lib/hooks/useProximaSDK';
import { useGetWorkspaceRepository } from '@/lib/hooks/useTest';
import { GeneralSetting, TestEntity } from '@/lib/types/Test';
import { EventBus } from '@/lib/utils/eventBus';
import { generateSortIndex, getKeyByValue, hasArrayItem } from '@/lib/utils/helper';
import { TestReport } from '@/services/models';
import { testConfigQuery } from '@/services/query';

import {
  BaseActionContext,
  BaseActionContextType,
  TestConfigContext,
  TestConfigContextType,
} from './context';
import { useGetPermissions } from './hooks';

const ItemCreateSuccessEventType = 'itemCreateSuccess';
const DefaultTestConfig = {} as TestConfigContextType['config'];

/** 获取测试实体，如果不存在创建 */
const getOrCreateTestEntity = async (
  itemId: string,
  options?: {
    repository?: string | null;
    fields?: Record<string, any>;
    iqlMap?: Record<string, any>;
    templateId?: string;
    defectsMapping?: Record<string, any>;
    itemData?: Record<string, any>;
    type?: string;
    notice?: boolean;
    t?: (val?: string) => string;
    proxima?: any;
  },
  preparedData?: {
    itemTypeMap?: Record<string, any>;
  },
) => {
  if (!itemId) return null;
  let testEntity;
  const { itemData, fields, type, t, iqlMap, templateId, defectsMapping, proxima } = options;
  const storeValues = store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM);

  let itemTypeMap = preparedData?.itemTypeMap;
  if (!itemTypeMap) {
    const testConfig = await getTestConfig({
      workspaceKey: itemData?.workspace?.key,
    });
    itemTypeMap = testConfig?.get('itemTypeMap');
  }

  if (itemTypeMap) {
    const testType = getKeyByValue(itemTypeMap, itemData?.itemType.key) as TestType;
    let needCreatedItem = {
      type: testType,
    };
    // 额外需要创建的字段
    let extraFields = {};
    if (!testType) {
      // 创建失败，通知用户无法创建测试实体
      options?.notice === true &&
        notification.warning({
          message: t('components.business.testManagerProvider.tips'),
          description: t('components.business.testManagerProvider.notHaveTestTypeTips'),
        });
      return null;
    }

    // 传入的类型和类型关联映射不一致不允许创建
    if (type && type !== testType) {
      notification.warning({
        message: t('components.business.testManagerProvider.tips'),
        description: t('components.business.testManagerProvider.notHaveTestTypeTips'),
      });
      return null;
    }

    // 测试报告创建
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
          ...needCreatedItem,
          ...detail,
          repository: storedRepository,
        };
      }
      console.info('extraFields', extraFields);
    }

    if (testType === TestType.Report) {
      if (templateId) {
        // 创建测试报告
        notification.open({
          message: t('report.generateLoading'),
          icon: <Spin spinning={true} />,
          duration: null,
        });
        const testReport = new TestReport();
        try {
          const { data: reportInfo, status } = await testReport.createReport(templateId, {
            name: itemData.name,
            dataSourceIql: iqlMap,
            workspace: itemData.workspace,
            defectsMapping,
            itemTypeMap,
            report: itemData,
            ...fields,
          });
          notification.destroy();
          needCreatedItem = {
            ...needCreatedItem,
            ...fields,
            ...{ reportChartGroup: reportInfo.chartGroup?.id },
          };

          console.info('create test report success!', reportInfo);
          // 生成测试报告离线文档
          // enableOfflineReport && (await generateTestReportOfflineFile(reportInfo?.data?.objectId));

          if (status === 'success') {
            proxima.execute('refreshTestReportTable', itemData?.objectId);
            notification.success({
              message: `${t('report.testReport')}【${reportInfo.name}】${t('report.addSuccess')}`,
            });
          } else {
            notification.error({
              message: `${t('report.testReport')}【${reportInfo.name}】${t('report.addFail')}`,
            });
          }

          console.info('needCreatedItem', needCreatedItem);
        } catch (error) {
          console.error('create test report error', error);
          notification.error({
            message: error.message,
          });
          return;
        }
      }
    }

    if (!isEmpty(needCreatedItem)) {
      const data = await updateTestEntity([
        {
          objectId: itemData.objectId,
          name: itemData.name,
          ...needCreatedItem,
        },
      ]);
      if (data?.status === 'error') {
        message.error(data.data);
        return;
      }
      testEntity = data?.[0];
    }
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
    t?: (val?: string) => string;
  },
) => {
  const { itemList, type, t } = options;
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
        message: t('components.business.testManagerProvider.tips'),
        description: t('components.business.testManagerProvider.notHaveTestTypeTips'),
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
            sortIndex: generateSortIndex(index + 1),
          }
        : {};

    return {
      name: item.name,
      objectId: item.objectId,
      // 事项创建成功时，需要增加 type 类型
      type: testType,
      ...extraFields,
    };
  });
  if (needCreatedTestEntities.length) {
    const res = await updateTestEntity(needCreatedTestEntities);
    if (res?.status === 'error') {
      message.error(res.data);
      return;
    }
    return res;
  }

  return itemList;
};

type RepositoryDataProviderProps = {
  itemId?: string;
  baseLineItemId?: string;
  workspaceKey?: string;
  children: React.ReactNode;
};

const eventBus = new EventBus();
// 消息 key，区分消息源。防止多个消息同时被接收
const messageKey = ItemCreateSuccessEventType + uuid();

const TestManagerProvider: React.FC<RepositoryDataProviderProps> = ({
  itemId,
  baseLineItemId,
  children,
  workspaceKey: workspaceKeyFromProp,
}) => {
  const proxima = createProximaSdk();
  const { t } = useI18n();
  const workspaceRef = useRef();
  const testConfigRef = useRef();

  const [testEntity, setTestEntity] = React.useState<TestEntity>();
  const [generalSetting, setGeneralSetting] = React.useState<GeneralSetting>();
  const workspaceKey = itemId ? testEntity?.workspace?.key : workspaceKeyFromProp;
  // 获取空间配置数据
  const { data: queryRes } = testConfigQuery.useWorkspaceTestConfig({
    workspaceKey,
  }) as any;

  // 当前空间
  const workspace = useMemo(() => queryRes?.workspace, [queryRes?.workspace]);

  // 全局配置
  const globalTestConfig = useMemo(() => queryRes?.globalTestConfig, [queryRes?.globalTestConfig]);

  // 当前测试管理配置
  const testConfig = useMemo(
    () => queryRes?.currentTestConfig || DefaultTestConfig,
    [queryRes?.currentTestConfig],
  );

  useEffect(() => {
    workspaceRef.current = workspace;
    testConfigRef.current = testConfig;
  }, [workspace, testConfig]);

  const { getCreatePermission } = useGetPermissions(workspace, testConfig);

  React.useEffect(() => {
    setTimeout(() => {
      proxima.execute('updateAllItemTypeEvent');
      // 冗余一个 item-type filter 请求，避免有地方报错
      proxima.execute('updateItemTypeEvent');
    }, 300);
  }, [proxima]);

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
            t,
            proxima,
          },
          {
            itemTypeMap: testConfig.itemTypeMap,
          },
        );
      }

      setTestEntity(testEntity);
    };
    const executeBaseLineItem = async baseLineItemId => {
      // 先获取事项详情
      const {
        list: [testEntity],
      } = await getTestEntityByQuery({
        query: {
          id: baseLineItemId,
        },
        selector: `'baseLineSources' in ['BaseLineItemVersion']`,
      });
      setTestEntity(testEntity);
    };

    if (baseLineItemId) {
      executeBaseLineItem(baseLineItemId);
    }

    if (itemId && !baseLineItemId && testConfig) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, testConfig, t]);

  // 获取测试管理通用配置
  React.useEffect(() => {
    const query = async () => {
      const generalSetting = await getGeneralSetting();
      setGeneralSetting(generalSetting);
    };
    query();
  }, []);

  const testPlanFieldKeys = useScreenFieldKeysFromTestConfig({
    testConfig,
    testType: TestType.Plan,
    workspaceKey,
  });

  const testCaseSetFieldKeys = useScreenFieldKeysFromTestConfig({
    testConfig,
    testType: TestType.CaseSet,
    workspaceKey,
  });

  const testReportFieldKeys = useScreenFieldKeysFromTestConfig({
    testConfig,
    testType: TestType.Report,
    workspaceKey,
  });

  const testCaseFieldKeys = useScreenFieldKeysFromTestConfig({
    testConfig,
    testType: TestType.Case,
    workspaceKey,
  });
  const { pathname } = useLocation();

  const getTestCaseRepositoryPath = useGetWorkspaceRepository(workspaceKey);

  React.useEffect(() => {
    pathname && repositoryFolderTreeEvent.dispatch();
  }, [pathname]);

  const testExecutionFieldKeys = useScreenFieldKeysFromTestConfig({
    testType: TestType.Execution,
    testConfig,
    workspaceKey,
  });

  // 获取全局配置时使用缓存
  const { runAsync: getGlobalConfig } = useRequest(
    async () => {
      return globalTestConfig?.extra ?? { statuses: [] };
    },
    {
      refreshDeps: [globalTestConfig],
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
          ...extraData,
          itemData,
          notice: true,
          proxima,
          t,
        });
      }
      eventBus.dispatch(messageKey, {
        extraData,
        testEntity: testEntity,
        item: itemData,
        useItemBatchCreate: false,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [testConfig.isolateTestType, workspace?.key, t],
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
            message: t('components.business.testManagerProvider.tips'),
            description: t('components.business.testManagerProvider.saveFailTips'),
          });
        }
      }

      if (!hasArrayItem(itemList)) return;
      const eventData = {} as any;
      // 缺陷类型不需要创建测试管理测试实体
      if (extraData.type !== TestType.TestDefect) {
        eventData.testEntityList = await getOrBatchCreateTestEntities(
          itemList.map(d => d.objectId),
          {
            itemList,
            notice: true,
            storeValueList,
            type: extraData.type,
            fields: extraData.fields,
            repository: extraData?.repository,
            t,
          },
        );

        if (!hasArrayItem(eventData.testEntityList)) return;
      }
      eventBus.dispatch(messageKey, {
        itemList,
        ...eventData,
        extraData,
        useItemBatchCreate: true,
      });
    },
    [testConfig.isolateTestType, workspace?.key, t],
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
        listType: testConfig?.testRunAction?.listType,
        statusList: testConfig?.testRunAction?.statusList,
        iql: testConfig?.testRunAction?.iql,
        caseSnapshot: testConfig?.caseSnapshot,
      },
      // item,
      workspace,
      testEntity,
      setTestEntity,
      baseLineItemId,
      generalSetting,
    };
  }, [
    testConfig.itemTypeMap,
    testConfig.defectsMapping,
    testConfig.isolateTestType,
    testConfig.statuses,
    testConfig?.testRunAction?.listType,
    testConfig?.testRunAction?.statusList,
    testConfig?.testRunAction?.iql,
    testConfig?.caseSnapshot,
    workspace,
    testEntity,
    baseLineItemId,
    generalSetting,
  ]);

  const baseActionContextValues = React.useMemo(() => {
    const actions: BaseActionContextType = {
      async createItemUseModal(params) {
        const { extraData, type, name, hideMessage, defaultValues = {} } = params;
        const currentTestConfig =
          Object.keys(testConfig).length > 0 ? testConfig : testConfigRef.current;
        const currentWorkspace = workspace || workspaceRef.current;

        let itemTypeKey = currentTestConfig?.itemTypeMap?.[type] as string;
        let itemType;
        let itemTypeList;
        const isTestDefect = type === TestType.TestDefect;
        // 获取缺陷类型 key
        if (isTestDefect) {
          // 可以配置多个类型，这里需要拿到全部可以配置的类型
          itemTypeList = await getItemTypeByKeys(currentTestConfig.defectsMapping);
          itemType = itemTypeList?.[0];
          itemTypeKey = currentTestConfig.defectsMapping?.[0];
        } else {
          itemType = await getItemTypeByKey(itemTypeKey ?? '');
        }

        if (!itemType?.objectId) {
          message.warning(t('components.business.testManagerProvider.notCreateCase'));
        }

        // 打开创建弹窗
        openCreateItemModal({
          name: name ?? '',
          itemTypeId: itemType?.objectId,
          workspaceId: currentWorkspace?.objectId,
          defaultValues,
          extraData: Object.assign(
            {
              hideMessage: hideMessage ?? true,
              type,
              workspaceId: currentWorkspace?.objectId,
              messageKey: messageKey,
              skipTestCaseCreate: true,
            },
            isTestDefect
              ? {
                  canCreateDefectItemTypeList: itemTypeList
                    ?.map(itemType => itemType?.objectId)
                    .filter(Boolean),
                }
              : {},
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
            if (!willValidateTestEntity?.type) return resolve(data);

            // 创建的测试类型是否符合预期
            let expectedTestType = willValidateTestEntity?.type === type;

            // 判断类型 key 是否在 defectsMapping 中
            if (type === TestType.TestDefect) {
              expectedTestType = (currentTestConfig?.defectsMapping ?? []).includes(
                willValidateItem?.itemType?.key,
              );
            }

            // TODO: 消息通知
            if (!expectedTestType) {
              message.error(t('components.business.testManagerProvider.typeUnmatched'));
              reject(t('components.business.testManagerProvider.typeUnmatched'));
              return;
            }

            resolve(data);
          });
        });
      },
      getGlobalConfig,
      getCreatePermission,
      getTestCaseRepositoryPath,
      testPlanFieldKeys,
      testCaseSetFieldKeys,
      testCaseFieldKeys,
      testReportFieldKeys,
      testExecutionFieldKeys,
      openItemViewPanel: openItemDetailPanel,
      globalTestConfig: globalTestConfig?.extra || { statuses: [] },
    };

    return actions;
  }, [
    getGlobalConfig,
    getCreatePermission,
    getTestCaseRepositoryPath,
    testConfig.defectsMapping,
    testConfig?.itemTypeMap,
    workspace?.objectId,
    testPlanFieldKeys,
    testReportFieldKeys,
    testCaseFieldKeys,
    testExecutionFieldKeys,
    globalTestConfig?.extra,
    t,
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
