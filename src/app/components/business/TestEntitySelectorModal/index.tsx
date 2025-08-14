/* eslint-disable no-unused-vars */
import { useRequest, useSafeState } from 'ahooks';
import { Button, Modal, Spin } from 'antd';
import { keyBy, reduce, uniq } from 'lodash';
import React, { useMemo } from 'react';

import DebounceSelect from '@/components/common/DebounceSelect';
import { getAllTestConfigs } from '@/lib/api/common';
import { getItemByIQL } from '@/lib/api/proxima';
import { TestType, TestTypeNameMapping } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import EventBus from '@/lib/utils/eventBus';
import { getTestManagerContainer, hasArrayItem } from '@/lib/utils/helper';

import cx from './index.less';
import InheritTestDetail from './InheritTestDetail';
import SelectorTable from './SelectorTable';
import TestDetailSelector from './TestDetailSelector';
import { TestEntitySelectorProvider } from './TestEntitySelectorContext';

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
  caseSetId?: string;
  isPlanForTestSet?: boolean; // 当为true时候，查询用例的时候会把用例关联的用例集给查出来，然后用来判断该用例是否可以选中
  width?: number;
  testType?: TestType;
  placeholder?: string;
  isSingleMode?: boolean;
  needFillValue?: boolean;
  modelType?: string;
  tableFieldsKeys?: string[];
  ignoreTestEntityIds?: string[];
  showDefaultRange?: boolean;
  onSelect?: (testIds: string[]) => void;
  actionRef?: React.ForwardedRef<ActionType>;
  afterClose?: () => void;
  onCancel?: () => void;
  getContainer?: () => HTMLElement;
  includesIds?: string[] | undefined;
  enableCaseVersion?: boolean; // 是否展示用例版本
  type?: string; // 操作类型，如 'add' 表示新建执行任务
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
    showDefaultRange,
    afterClose,
    onCancel,
    getContainer,
    caseSetId,
    isPlanForTestSet = false,
    enableCaseVersion = false,
    includesIds,
    type,
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

  const [versionMapKeySelected, setVersionMapKeySelected] = React.useState({})

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
    async () =>
      getAllTestConfigs(['itemTypeMap', 'defectsMapping', 'workspaceKey', 'testRunAction']),
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
        itemId: includesIds,
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
            <div title={item.name} className={cx('select-box', 'test-defect-select-box')}>
              <div className={cx('select-title')} title={item.name}>
                {item.name}
              </div>
              <div className={cx('select-key')}>({item.key})</div>
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
            const { selectedData, treeType, planId, caseVersion } = data;
            const messageData = JSON.stringify(selectedData);
            if (PreviousMessageData === messageData) return;
            PreviousMessageData = messageData;
            resolve(
              planId
                ? {
                    selectedData,
                    treeType,
                    caseVersion,
                  }
                : { selectedData, caseVersion },
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
    eventBusRef.current.dispatch(AddExistedTestEventType, { selectedData, treeType, planId, caseVersion: versionMapKeySelected });
    setSelectValue(isSingleMode ? undefined : []);
    setVisible(false);
    setVersionMapKeySelected({})
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
    versionMapKeySelected,
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
        caseSetId={caseSetId}
        isPlanForTestSet={isPlanForTestSet}
        treeType={treeType}
        setTreeType={setTreeType}
        showDefaultRange={showDefaultRange}
        validateCaseStatus
        enableCaseVersion={enableCaseVersion}
        versionMapKeySelected={versionMapKeySelected}
        setVersionMapKeySelected={setVersionMapKeySelected}
      />
    );
  }, [
    isSingleMode,
    workspace?.key,
    selectValue,
    ignoreTestEntityIds,
    isolateTestType,
    planId,
    treeType,
    showDefaultRange,
    enableCaseVersion,
    versionMapKeySelected,
    setVersionMapKeySelected,
  ]);

  const ModalFooterNode = React.useMemo(() => {
    const { ok, cancel } = modelProps?.footer ?? {};
    const getDisabled = () => {
      if (testType === TestType.Case) return !selectedTestDetails?.length;
      if ([TestType.TestDefect, TestType.Execution].includes(testType)) return !selectValue?.length;
      return false;
    };
    const btnDisabled = getDisabled();
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
          <Button type="primary" disabled={btnDisabled} onClick={handleOkButtonClick}>
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
    selectValue,
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
    <TestEntitySelectorProvider type={type}>
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
        getContainer={getContainer ?? getTestManagerContainer}
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
        width={testType === TestType.Case ? 830 : width ?? 580}
      >
        {testSelectNode}
      </Modal>
    </TestEntitySelectorProvider>
  );
};
TestEntitySelector.displayName = 'TestEntitySelectorModal';
export default React.memo(TestEntitySelector);
