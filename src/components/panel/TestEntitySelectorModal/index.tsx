import React from 'react';
import { Modal, Spin } from '@osui/ui';
import { TestType } from '@/lib/constants';
import { uniq, reduce, keyBy } from 'lodash';
import EventBus from '@/lib/utils/eventBus';
import { getItemByIQL } from '@/lib/api/proxima';
import { useSafeState, useRequest } from 'ahooks';
import { useTestConfig } from '@/lib/hooks/useContext';
import DebounceSelect from '@/components/common/DebounceSelect';
import { getRootContainer, hasArrayItem } from '@/lib/utils/helper';
import { getAllTestConfigs, getTestEntities } from '@/lib/api/common';
import { TestTypeNameMapping } from '@/lib/constants';

import cx from './index.less';

const AddExistedTestEventType = 'ADD_EXISTED_TEST';

export type ActionType = {
  open: (params?: { testType?: TestType; ignoreTestEntityIds?: string[] }) => any;
};

type TestEntitySelectorProps = {
  title?: string;
  testType?: TestType;
  placeholder?: string;
  isSingleMode?: boolean;
  needFillValue?: boolean;
  ignoreTestEntityIds?: string[];
  onSelect?: (testIds: string[]) => void;
  actionRef?: React.ForwardedRef<ActionType>;
};

const TestEntitySelector: React.FC<TestEntitySelectorProps> = props => {
  const { actionRef, ignoreTestEntityIds = [], isSingleMode, needFillValue } = props;
  const [visible, setVisible] = useSafeState(false);
  const debounceSelectContainerRef = React.useRef();
  const [selectValue, setSelectValue] = useSafeState([]);
  const [testType, setTestType] = useSafeState<TestType>(props.testType);
  // 是否是测试缺陷类型
  const isTestDefectType = testType === TestType.TestDefect;
  // 测试类型名
  const testTypeName = TestTypeNameMapping[testType] ?? '事项';

  const {
    workspace,
    config: { isolateTestType = [] },
  } = useTestConfig();

  // 数据缓存
  const dataCacheDictRef = React.useRef({});
  const eventBusRef = React.useRef<any>(new EventBus());
  // 空间条件
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
                  [key]: isolateTestType.includes(key as TestType) ? [] : value,
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
        }, keyBy(Object.keys(TestType)));

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

  // 事项类型查询条件
  const itemTypeCondition = React.useMemo(
    () => (isTestDefectType ? testDefectsMapping : testTypeMapping?.[testType]) ?? [],
    [testType, testTypeMapping, isTestDefectType, testDefectsMapping],
  );

  // 获取测试事项
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
      let testEntityDict = {} as Record<string, any>;
      if (isTestDefectType) {
        // 测试缺陷没有测试实体, 直接用 iql 查询出来的结果
        testEntityDict = itemDict;
      } else {
        const testEntities = await getTestEntities({ itemId: Object.keys(itemDict) });
        testEntityDict = keyBy(
          testEntities
            .map(testEntity => {
              const data = testEntity.toJSON();
              const reference = itemDict[data.reference?.objectId];
              // 填充 reference
              data.reference = reference;
              return reference ? data : null;
            })
            .filter(Boolean),
          'objectId',
        );
      }

      // 缓存 testEntity
      dataCacheDictRef.current = {
        ...dataCacheDictRef.current,
        ...testEntityDict,
      };

      return Object.values(testEntityDict).map(entity => {
        const item = entity?.reference ?? entity;
        return {
          label: (
            <div>
              <span style={{ display: 'inline-block', marginRight: 4, fontSize: 13 }}>
                {item.name}
              </span>
              <span style={{ fontSize: 12, color: '#aaa' }}>({item.key})</span>
            </div>
          ),
          value: entity.objectId,
        };
      });
    },
    {
      manual: true,
    },
  );

  React.useImperativeHandle(actionRef, () => ({
    async open(params) {
      setSelectValue([]);
      if (params?.testType) {
        setTestType(params.testType);
      }

      // 手动获取像配置数据
      if (isTestDefectType && !testDefectsMapping) {
        await getTestDefectsMapping();
      }

      if (!isTestDefectType && !testTypeMapping) {
        await getTestTypeMapping();
      }

      setVisible(true);

      typeof eventBusRef?.current?.disposer?.unregister === 'function' &&
        eventBusRef.current.disposer.unregister();

      return new Promise(resolve => {
        eventBusRef.current.disposer = eventBusRef.current.register(
          AddExistedTestEventType,
          resolve,
        );
      });
    },
  }));

  const handleOkButtonClick = React.useCallback(() => {
    const filledValue = Array.isArray(selectValue)
      ? selectValue.map(key => dataCacheDictRef.current[key])
      : dataCacheDictRef.current[selectValue];

    const selectData = needFillValue ? filledValue : selectValue;
    if (typeof props.onSelect === 'function') {
      props.onSelect(selectData);
    }
    eventBusRef.current.dispatch(AddExistedTestEventType, selectData);
    setVisible(false);
  }, [needFillValue, props, selectValue, setVisible]);

  const filterOptions = React.useCallback(
    options => {
      // 在 ignoreTestEntityIds 列表的数据给过滤掉
      return options.filter(opt => !ignoreTestEntityIds.includes(opt.value));
    },
    [ignoreTestEntityIds],
  );

  const debounceSelectProps: any = isSingleMode
    ? {
        showSearch: true,
      }
    : {
        mode: 'multiple',
      };

  return (
    <Modal
      visible={visible}
      className={cx('modal')}
      onOk={handleOkButtonClick}
      getContainer={getRootContainer}
      onCancel={() => setVisible(false)}
      title={props.title ?? `请选择${testTypeName}`}
    >
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
    </Modal>
  );
};

export default React.memo(TestEntitySelector);
