/* eslint-disable no-unused-vars */
import React, { useMemo } from 'react';
import { TestType } from '@/lib/constants';
import { uniq, reduce, keyBy } from 'lodash';
import EventBus from '@/lib/utils/eventBus';
import { Modal, Spin, Button } from 'antd';
import { getItemByIQL } from '@/lib/api/proxima';
import { useSafeState, useRequest } from 'ahooks';
import { TestTypeNameMapping } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import DebounceSelect from '@/components/common/DebounceSelect';
import { getRootContainer, getTestManagerContainer, hasArrayItem } from '@/lib/utils/helper';
import { getAllTestConfigs } from '@/lib/api/common';
import InheritTestDetail from './InheritTestDetail';
import TestDetailSelector from './TestDetailSelector';
import useI18n from '@/lib/hooks/useI18n';
import SelectorTable from './SelectorTable';

import cx from './index.less';

const AddExistedTestEventType = 'ADD_EXISTED_TEST';

let PreviousMessageData = null;
let PreviousButtonClicked = false;

export type ActionType = {
  open: (params?: {
    testType?: TestType;
    treeType?: string;
    ignoreTestEntityIds?: string[];
    modelProps?: ModelProps;
    selectValue?: string[];
  }) => any;
};

type ModelProps = {
  title?: string;
  footer: ModelPropsFooter;
};

type ModelPropsFooter = {
  ok?: ModelBtn;
  cancel?: ModelBtn;
};

type ModelBtn = {
  name?: string;
  cb?: (val?: any) => void;
};

export type TestEntitySelectorProps = {
  title?: string;
  planId?: string;
  width?: number;
  testType?: TestType;
  placeholder?: string;
  isSingleMode?: boolean;
  needFillValue?: boolean;
  modelType?: string;
  tableFieldsKeys?: string[];
  ignoreTestEntityIds?: string[];
  onSelect?: (testIds: string[]) => void;
  actionRef?: React.ForwardedRef<ActionType>;
  afterClose?: () => void;
  onCancel?: () => void;
};

const TestEntitySelector: React.FC<TestEntitySelectorProps> = props => {
  const { t } = useI18n();
  const {
    planId,
    actionRef,
    ignoreTestEntityIds = [],
    isSingleMode = false,
    needFillValue,
    tableFieldsKeys,
    width,
    afterClose,
    onCancel,
  } = props;
  const [visible, setVisible] = useSafeState(false);
  const debounceSelectContainerRef = React.useRef();
  const [selectValue, setSelectValue] = useSafeState<any>(isSingleMode ? '' : []);
  const [selectedTestDetails, setSelectedTestDetails] = React.useState([]);
  const [testType, setTestType] = useSafeState<TestType>(props.testType);
  const [treeType, setTreeType] = React.useState('repository');
  // 是否是测试缺陷类型
  const isTestDefectType = testType === TestType.TestDefect;
  // 测试类型名
  const testTypeName = t(`common.${TestTypeNameMapping[testType]}`);

  const [modelProps, setModelProps] = useSafeState<ModelProps | undefined>(undefined);

  const {
    workspace,
    config: { isolateTestType = [] },
  } = useTestConfig();

  // 数据缓存
  const dataCacheDictRef = React.useRef({});
  const eventBusRef = React.useRef<any>(new EventBus());
  // 空间条件
  // TODO 空间隔离
  const workspaceKeyCondition = React.useMemo(
    () => (isolateTestType.includes(testType) ? workspace?.key : ''),
    [isolateTestType, testType, workspace?.key],
  );

  // 获取租户所有的配置
  const { runAsync: getAllConfigs } = useRequest(
    async () => getAllTestConfigs(['itemTypeMap', 'defectsMapping', 'workspaceKey']),
    {
      manual: true,
      cacheTime: 99999999999,
      staleTime: 99999999999,
      cacheKey: 'allTestConfigs',
    },
  );

  // 获取测试执行任务列表
  // const { runAsync: getTestExecutionList } = useRequest(
  //   async (params = {}) => {
  //     const { list } = await getTestEntityByQuery({
  //       query: {
  //         workspaceKey: workspaceKeyCondition,
  //         type: testType,
  //         id: {
  //           operator: 'not in',
  //           value: ignoreTestEntityIds,
  //         } as any,
  //       },
  //       ascending: ['sortIndex', 'createdAt'],
  //       ...params,
  //     });

  //     return list;
  //   },
  //   {
  //     manual: true,
  //   },
  // );

  // 获取测试实体类型关联配置
  const { data: testTypeMapping, runAsync: getTestTypeMapping } = useRequest(
    async () => {
      const configs = await getAllConfigs();
      const itemTypeMapping: Record<TestType, string[]> = configs
        .map(_config => {
          const config = _config?.toJSON();
          if (!config || !workspace?.key) return;
          const workspaceKey = config.workspaceKey;
          const itemTypeMapping = config.itemTypeMap;
          const currentWorkspaceKey = workspace.key;
          // 处理跨空间隔离
          if (workspaceKey !== currentWorkspaceKey && hasArrayItem(isolateTestType)) {
            return reduce(
              itemTypeMapping,
              (result, value, key) => {
                return {
                  ...result,
                  // 如果当前空间的测试类型有空间隔离配置，则返回 []
                  // [key]: isolateTestType.includes(key as TestType) ? [] : value,
                  [key]: '',
                };
              },
              {},
            );
          }
          return itemTypeMapping;
        })
        // 过滤没有值的 itemTypeMapping
        .filter(mapping => hasArrayItem(Object.keys(mapping ?? {})))
        .reduce((result, mapping) => {
          return Object.keys(result).reduce((acc, key) => {
            // 获取合并的 itemTypes
            const getMergedItemTypes = () => {
              const itemTypes = Array.isArray(acc[key]) ? acc[key] : [];
              return uniq(itemTypes.concat(mapping?.[key] ?? []));
            };
            return {
              ...acc,
              [key]: getMergedItemTypes(),
            };
          }, result);
        }, keyBy(Object.values(TestType)));

      return itemTypeMapping;
    },
    {
      manual: true,
      cacheKey: 'allItemTypeMappings',
    },
  );

  // 获取测试缺陷类型
  const { data: testDefectsMapping, runAsync: getTestDefectsMapping } = useRequest(async () => {
    const configs = await getAllConfigs();
    const isolateWithWorkspace = isolateTestType.includes(TestType.TestDefect);

    return configs.reduce((acc, item) => {
      const config = item.toJSON();
      // 如果有缺陷隔离配置，则不处理 config
      if (isolateWithWorkspace && config.workspaceKey !== workspace?.key) return acc;
      return acc.concat(config.defectsMapping);
    }, []);
  });

  // 类型查询条件
  const itemTypeCondition = React.useMemo(() => {
    return (isTestDefectType ? testDefectsMapping : testTypeMapping?.[testType]) ?? [];
  }, [testType, testTypeMapping, isTestDefectType, testDefectsMapping]);

  // 获取测试用例
  const { runAsync: getTestEntityByKeyword, loading: searchLoading } = useRequest(
    async keyword => {
      const params = testType === TestType.TestDefect ? {} : { r_test_manager_type: testType };
      const { items } = await getItemByIQL({
        limit: 50,
        nameOrKeyLike: keyword,
        itemType: itemTypeCondition,
        orderBy: ['修改时间', 'desc'],
        workspace: workspaceKeyCondition,
        ...params,
      });

      const itemDict = keyBy(items, 'objectId');
      let testEntityDict = itemDict as Record<string, any>;
      if (isTestDefectType) {
        // 测试缺陷没有测试实体, 直接用 iql 查询出来的结果
        testEntityDict = itemDict;
      }

      // 缓存 testEntity
      dataCacheDictRef.current = {
        ...dataCacheDictRef.current,
        ...testEntityDict,
      };

      return Object.values(testEntityDict).map(item => {
        return {
          label: (
            <div>
              <span style={{ display: 'inline-block', marginRight: 4, fontSize: 13 }}>
                {item.name}
              </span>
              <span style={{ fontSize: 12, color: '#aaa' }}>({item.key})</span>
            </div>
          ),
          value: item.id,
        };
      });
    },
    {
      refreshDeps: [testType],
      manual: true,
    },
  );

  React.useImperativeHandle(actionRef, () => ({
    async open(params) {
      if (params?.selectValue) {
        setSelectValue(params?.selectValue ?? []);
      }
      if (params?.testType) {
        setTestType(params.testType);
      }

      if (params?.treeType) {
        setTreeType(params.treeType);
      }

      if (params?.modelProps) {
        setModelProps(params.modelProps);
      }

      // 手动获取像配置数据
      if (isTestDefectType && !testDefectsMapping) {
        await getTestDefectsMapping();
      }

      if (!isTestDefectType && !testTypeMapping) {
        await getTestTypeMapping();
      }

      setVisible(true);

      eventBusRef.current.disposer();

      return new Promise(resolve => {
        eventBusRef.current.disposer = eventBusRef.current.register(
          AddExistedTestEventType,
          data => {
            const { selectedData, treeType, planId } = data;
            const messageData = JSON.stringify(selectedData);
            if (PreviousMessageData === messageData) return;
            PreviousMessageData = messageData;
            resolve(
              planId
                ? {
                    selectedData,
                    treeType,
                  }
                : selectedData,
            );
            // 下一轮事件循环取消锁
            setTimeout(() => {
              PreviousButtonClicked = false;
              PreviousMessageData = null;
            });
          },
        );
      });
    },
  }));

  const handleOkButtonClick = React.useCallback(async () => {
    if (PreviousButtonClicked) return;
    PreviousButtonClicked = true;
    let selectedData = selectedTestDetails;
    if (testType !== TestType.Case) {
      const filledValue = Array.isArray(selectValue)
        ? selectValue.map(key => dataCacheDictRef.current[key])
        : dataCacheDictRef.current[selectValue];

      selectedData = needFillValue ? filledValue : selectValue;
    }

    typeof props.onSelect === 'function' && props.onSelect(selectedData);

    eventBusRef.current.dispatch(AddExistedTestEventType, { selectedData, treeType, planId });
    setSelectValue(isSingleMode ? undefined : []);
    setVisible(false);
  }, [
    selectedTestDetails,
    testType,
    props,
    treeType,
    planId,
    setSelectValue,
    isSingleMode,
    setVisible,
    selectValue,
    needFillValue,
  ]);

  const filterOptions = React.useCallback(
    options => {
      // 在 ignoreTestEntityIds 列表的数据给过滤掉
      return options.filter(opt => !ignoreTestEntityIds?.includes(opt.value));
    },
    [ignoreTestEntityIds],
  );

  // 测试执行任务，计划，缺陷选择器
  const testEntitySelectorNode = React.useMemo(() => {
    const debounceSelectProps: any = isSingleMode
      ? {
          showSearch: true,
        }
      : {
          mode: 'multiple',
        };
    return (
      <>
        <p className={cx('hint')}>{t('components.business.testEntitySelectorModal.modelTip')}</p>
        <div ref={debounceSelectContainerRef}>
          <DebounceSelect
            {...debounceSelectProps}
            value={selectValue}
            loading={searchLoading}
            className={cx('select')}
            filterOptions={filterOptions}
            fetchOptions={getTestEntityByKeyword}
            onChange={value => setSelectValue(value)}
            getPopupContainer={() => debounceSelectContainerRef.current}
            placeholder={
              props.placeholder ?? t('components.business.testEntitySelectorModal.modelTip')
            }
            notFoundContent={
              searchLoading ? (
                <Spin />
              ) : (
                <div>
                  {`${t('components.business.testEntitySelectorModal.notFound')} ${testTypeName}`}
                </div>
              )
            }
          />
        </div>
      </>
    );
  }, [
    filterOptions,
    getTestEntityByKeyword,
    isSingleMode,
    props?.placeholder,
    searchLoading,
    selectValue,
    setSelectValue,
    t,
    testTypeName,
  ]);

  // 测试计划选择器
  const testDetailSelectorNode = React.useMemo(() => {
    const TestComponents = isSingleMode ? InheritTestDetail : TestDetailSelector;
    return (
      <TestComponents
        isSingleMode={isSingleMode}
        workspaceKey={workspace?.key}
        selectValue={selectValue}
        ignoreTestDetailIds={ignoreTestEntityIds}
        isWorkspaceIsolate={isolateTestType.includes(TestType.Case)}
        onTestDetailSelect={testDetails => setSelectedTestDetails(testDetails ?? [])}
        planId={planId}
        treeType={treeType}
        setTreeType={setTreeType}
      />
    );
  }, [
    isolateTestType,
    workspace?.key,
    isSingleMode,
    ignoreTestEntityIds,
    selectValue,
    planId,
    treeType,
  ]);

  const ModalFooterNode = React.useMemo(() => {
    const { ok, cancel } = modelProps?.footer ?? {};
    return (
      <div className={cx('footer')}>
        {testType === TestType.Case ? (
          <div className={cx('info')}>
            {t('components.business.testEntitySelectorModal.selected')}
            <strong className={cx('num')}>
              {(selectedTestDetails ?? []).filter?.(d => !ignoreTestEntityIds?.includes(d)).length}
            </strong>
            {t('components.business.testEntitySelectorModal.case')}
          </div>
        ) : null}
        <div className={cx('actions')}>
          <Button
            onClick={() => {
              testType === TestType.Case && setTreeType('repository');
              onCancel?.();
              setSelectValue(isSingleMode ? undefined : []);
              setVisible(false);
            }}
          >
            {cancel?.name ?? t('common.cancel')}
          </Button>
          <Button type="primary" onClick={handleOkButtonClick}>
            {ok?.name ?? t('common.confirm')}
          </Button>
        </div>
      </div>
    );
  }, [
    modelProps?.footer,
    testType,
    t,
    selectedTestDetails,
    handleOkButtonClick,
    ignoreTestEntityIds,
    onCancel,
    setSelectValue,
    isSingleMode,
    setVisible,
  ]);

  const testSelectNode = useMemo(() => {
    if (testType === TestType.Case) {
      return testDetailSelectorNode;
    }
    if (testType === TestType.Execution) {
      return (
        <SelectorTable
          workspaceKey={workspace?.key}
          testType={testType}
          workspaceKeyCondition={workspaceKeyCondition}
          selectValue={selectValue}
          setSelectValue={setSelectValue}
          tableFieldsKeys={tableFieldsKeys}
        />
      );
    }
    return testEntitySelectorNode;
  }, [
    testType,
    testEntitySelectorNode,
    testDetailSelectorNode,
    workspace?.key,
    workspaceKeyCondition,
    selectValue,
    setSelectValue,
    tableFieldsKeys,
  ]);

  return (
    <Modal
      destroyOnClose
      afterClose={() => {
        PreviousButtonClicked = false;
        PreviousMessageData = null;
        afterClose?.();
      }}
      keyboard={false}
      open={visible}
      maskClosable={false}
      className={cx('modal')}
      getContainer={testType === TestType.Execution ? getTestManagerContainer : getRootContainer}
      footer={ModalFooterNode}
      onCancel={() => {
        testType === TestType.Case && setTreeType('repository');
        setSelectValue(isSingleMode ? undefined : []);
        setVisible(false);
      }}
      title={
        modelProps?.title ??
        props.title ??
        `${t('components.business.testEntitySelectorModal.pleaseSelect')}${testTypeName}`
      }
      width={testType === TestType.Case ? 800 : width ?? 500}
      bodyStyle={{
        padding: '16px 24px',
      }}
    >
      {testSelectNode}
    </Modal>
  );
};

export default React.memo(TestEntitySelector);
