import React from 'react';
import { Modal } from '@osui/ui';
import { uniq, uniqBy } from 'lodash';
import { TestType } from '@/lib/constants';
import { getItemByIQL } from '@/lib/api/proxima';
import { useSafeState, useRequest } from 'ahooks';
import EventBus from '@/lib/utils/eventBus';
import { getRootContainer } from '@/lib/utils/helper';
import DebounceSelect from '@/components/common/DebounceSelect';
import { getAllTestConfigs, getTestEntities } from '@/lib/api/common';

import cx from './index.less';

const AddExistedTestEventType = 'ADD_EXISTED_TEST';

export type ActionType = {
  open: (params?: { testType?: TestType; ignoreTestEntityIds?: string[] }) => any;
};

type TestEntitySelectorProps = {
  title?: string;
  testType?: TestType;
  placeholder?: string;
  ignoreTestEntityIds?: string[];
  onSelect?: (testIds: string[]) => void;
  actionRef?: React.ForwardedRef<ActionType>;
};

const TestEntitySelector: React.FC<TestEntitySelectorProps> = props => {
  const { actionRef, ignoreTestEntityIds = [] } = props;
  const [visible, setVisible] = useSafeState(false);
  const debounceSelectContainerRef = React.useRef();
  const [selectValue, setSelectValue] = useSafeState([]);
  const [testType, setTestType] = useSafeState<TestType>(props.testType);

  const eventBusRef = React.useRef<any>(new EventBus());

  // 获取租户测试类型关联的 itemType keys
  const { data: testTypeAssItemTypeKeys, runAsync: getTestTypeAssItemTypeKeys } = useRequest(
    async () => {
      const configs = await getAllTestConfigs(['itemTypeMap']);
      const itemTypeMaps = configs.map(config => config?.toJSON()?.itemTypeMap).filter(Boolean);
      // 测试实体类型
      const testTypes = Object.values(TestType);
      return testTypes.reduce((acc, testType) => {
        return {
          ...acc,
          [testType]: uniq(itemTypeMaps.map(map => map[testType]).filter(Boolean)),
        };
      }, {}) as Record<TestType, string[]>;
    },
    {
      manual: true,
      cacheKey: 'allItemTypeMappings',
    },
  );

  /** 获取测试事项 */
  const { runAsync: getTestEntityByName } = useRequest(
    async name => {
      const { items } = await getItemByIQL({
        limit: 50,
        nameLike: name,
        itemType: testTypeAssItemTypeKeys?.[testType] ?? [],
      });

      const itemId = items.map(item => item.objectId);
      const testEntities = await getTestEntities({ itemId });
      const testEntitiesData = uniqBy(testEntities.map(item => item.toJSON()) as any[], 'objectId');
      return testEntitiesData
        .map(testEntity => {
          const item = items.find(item => item.objectId === testEntity.reference?.objectId);
          if (!item) return;
          return {
            label: (
              <div>
                <span style={{ display: 'inline-block', marginRight: 4, fontSize: 13 }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 12, color: '#aaa' }}>({item.key})</span>
              </div>
            ),
            value: testEntity.objectId,
          };
        })
        .filter(Boolean);
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
      if (!testTypeAssItemTypeKeys) {
        await getTestTypeAssItemTypeKeys();
      }
      setVisible(true);

      return new Promise(resolve => {
        eventBusRef.current.disposer = eventBusRef.current.register(
          AddExistedTestEventType,
          data => {
            typeof eventBusRef?.current?.disposer?.unregister === 'function' &&
              eventBusRef.current.disposer.unregister();
            resolve(data);
          },
        );
      });
    },
  }));

  const handleOkButtonClick = React.useCallback(() => {
    if (typeof props.onSelect === 'function') {
      props.onSelect(selectValue);
    }
    eventBusRef.current.dispatch(AddExistedTestEventType, selectValue);
    setVisible(false);
  }, [props, selectValue, setVisible]);

  const filterOptions = React.useCallback(
    options => {
      // 在 ignoreTestEntityIds 列表的数据给过滤掉
      return options.filter(opt => !ignoreTestEntityIds.includes(opt.value));
    },
    [ignoreTestEntityIds],
  );

  return (
    <Modal
      visible={visible}
      className={cx('modal')}
      onOk={handleOkButtonClick}
      getContainer={getRootContainer}
      onCancel={() => setVisible(false)}
      title={props.title ?? '测试管理选择'}
    >
      <p className={cx('hint')}>请输入并从列表中选择已存在的事项</p>
      <div ref={debounceSelectContainerRef}>
        <DebounceSelect
          mode="multiple"
          value={selectValue}
          className={cx('select')}
          filterOptions={filterOptions}
          fetchOptions={getTestEntityByName}
          onChange={value => setSelectValue(value)}
          notFoundContent={<div>未查询到相关事项</div>}
          placeholder={props.placeholder ?? '选择事项'}
          getPopupContainer={() => debounceSelectContainerRef.current}
        />
      </div>
    </Modal>
  );
};

export default React.memo(TestEntitySelector);
