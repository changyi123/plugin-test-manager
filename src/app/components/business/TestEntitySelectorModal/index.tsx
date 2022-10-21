/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React from 'react';
import { TestType } from '@/lib/constants';
import { uniq, reduce, keyBy } from 'lodash';
import EventBus from '@/lib/utils/eventBus';
import { Modal, Spin, Button } from 'antd';
import { getItemByIQL } from '@/lib/api/proxima';
import { useSafeState, useRequest } from 'ahooks';
import { TestTypeNameMapping } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import DebounceSelect from '@/components/common/DebounceSelect';
import { getRootContainer, hasArrayItem } from '@/lib/utils/helper';
import { getAllTestConfigs } from '@/lib/api/common';
import InheritTestDetail from './InheritTestDetail';
import TestDetailSelector from './TestDetailSelector';

import cx from './index.less';

const AddExistedTestEventType = 'ADD_EXISTED_TEST';

let PreviousMessageData = null;
let PreviousButtonClicked = false;

export type ActionType = {
  open: (params?: {
    testType?: TestType;
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
  testType?: TestType;
  placeholder?: string;
  isSingleMode?: boolean;
  needFillValue?: boolean;
  ignoreTestEntityIds?: string[];
  onSelect?: (testIds: string[]) => void;
  actionRef?: React.ForwardedRef<ActionType>;
  afterClose?: () => void;
};

const TestEntitySelector: React.FC<TestEntitySelectorProps> = props => {
  const {
    actionRef,
    ignoreTestEntityIds = [],
    isSingleMode = false,
    needFillValue,
    afterClose,
  } = props;
  const [visible, setVisible] = useSafeState(false);
  const debounceSelectContainerRef = React.useRef();
  const [selectValue, setSelectValue] = useSafeState([]);
  const [selectedTestDetails, setSelectedTestDetails] = React.useState([]);
  const [testType, setTestType] = useSafeState<TestType>(props.testType);
  // 是否是测试缺陷类型
  const isTestDefectType = testType === TestType.TestDefect;
  // 测试类型名
  const testTypeName = TestTypeNameMapping[testType] ?? '事项';

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

  // 获取测试实体类型关联配置
  const { data: testTypeMapping, runAsync: getTestTypeMapping } = useRequest(
    async () => {
      const configs = await getAllConfigs();
      const itemTypeMapping: Record<TestType, string[]> = configs
        .map(_config => {
          const config = _config?.toJSON();
          if (!config) return;
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
      const { items } = await getItemByIQL({
        limit: 50,
        nameOrKeyLike: keyword,
        itemType: itemTypeCondition,
        orderBy: ['修改时间', 'desc'],
        workspace: workspaceKeyCondition,
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
          value: item.objectId,
        };
      });
    },
    {
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
            const messageData = JSON.stringify(data);
            if (PreviousMessageData === messageData) return;
            PreviousMessageData = messageData;
            resolve(data);
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

    eventBusRef.current.dispatch(AddExistedTestEventType, selectedData);
    setVisible(false);
  }, [needFillValue, props, selectValue, selectedTestDetails, setVisible, testType]);

  const filterOptions = React.useCallback(
    options => {
      // 在 ignoreTestEntityIds 列表的数据给过滤掉
      return options.filter(opt => !ignoreTestEntityIds.includes(opt.value));
    },
    [ignoreTestEntityIds],
  );

  // 测试执行，计划，缺陷选择器
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
        <p className={cx('hint')}>请输入并从列表中选择已存在的{testTypeName}</p>
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
            placeholder={props.placeholder ?? `请输入并从列表中选择已存在的${testTypeName}`}
            notFoundContent={searchLoading ? <Spin /> : <div>未查询到相关{testTypeName}</div>}
          />
        </div>
      </>
    );
  }, [
    filterOptions,
    getTestEntityByKeyword,
    isSingleMode,
    props.placeholder,
    searchLoading,
    selectValue,
    setSelectValue,
    testTypeName,
  ]);

  // 测试计划选择器
  const testDetailSelectorNode = React.useMemo(() => {
    const TestComponets = isSingleMode ? InheritTestDetail : TestDetailSelector;
    return (
      <TestComponets
        isSingleMode={isSingleMode}
        workspaceKey={workspace?.key}
        selectValue={selectValue}
        ignoreTestDetailIds={ignoreTestEntityIds}
        isWorkspaceIsolate={isolateTestType.includes(TestType.Case)}
        onTestDetailSelect={testDetails => setSelectedTestDetails(testDetails)}
      />
    );
  }, [isolateTestType, workspace?.key, isSingleMode, ignoreTestEntityIds, selectValue]);

  const ModalFooterNode = React.useMemo(() => {
    const { ok, cancel } = modelProps?.footer ?? {};
    return (
      <div className={cx('footer')}>
        {testType === TestType.Case ? (
          <div className={cx('info')}>
            已选择
            <strong className={cx('num')}>
              {selectedTestDetails.filter(d => !ignoreTestEntityIds.includes(d)).length}
            </strong>
            条用例
          </div>
        ) : null}
        <div className={cx('actions')}>
          <Button
            onClick={() => {
              cancel?.cb?.();
              setSelectValue(undefined);
              setVisible(false);
            }}
          >
            {cancel?.name ?? '取消'}
          </Button>
          <Button type="primary" onClick={handleOkButtonClick}>
            {ok?.name ?? '确定'}
          </Button>
        </div>
      </div>
    );
  }, [
    handleOkButtonClick,
    selectedTestDetails,
    setVisible,
    testType,
    ignoreTestEntityIds,
    modelProps?.footer,
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
      visible={visible}
      maskClosable={false}
      className={cx('modal')}
      getContainer={getRootContainer}
      footer={ModalFooterNode}
      onCancel={() => {
        setSelectValue(undefined);
        setVisible(false);
      }}
      title={modelProps?.title ?? props.title ?? `请选择${testTypeName}`}
      width={testType === TestType.Case ? 800 : 500}
      bodyStyle={{
        padding: '16px 24px',
      }}
    >
      {testType === TestType.Case ? testDetailSelectorNode : testEntitySelectorNode}
    </Modal>
  );
};

export default React.memo(TestEntitySelector);
