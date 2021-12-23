import React from 'react';
import { Modal } from '@osui/ui';
import { uniq, uniqBy } from 'lodash';
import { TestType } from '@/lib/constants';
import { useSafeState, useRequest } from 'ahooks';
import { getItemByIQL } from '@/lib/api/proxima';
import { getRootContainer } from '@/lib/utils/helper';
import DebounceSelect from '@/components/common/DebounceSelect';
import { getAllTestConfigs, getTestEntityByItemId } from '@/lib/api/common';

import cx from './index.less';

export type ActionType = {
  open: (params?: { testType?: TestType; ignoreWorkspaceKeys?: string[] }) => void;
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
  const debounceSelectContainerRef = React.useRef();
  const [visible, setVisible] = useSafeState(false);
  const [selectValue, setSelectValue] = useSafeState([]);
  const [testType, setTestType] = useSafeState<TestType>(props.testType);

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

      const itemIds = items.map(item => item.objectId);
      const testEntities = await getTestEntityByItemId(itemIds);
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
    },
  }));

  const handleOkButtonClick = React.useCallback(() => {
    if (typeof props.onSelect === 'function') {
      props.onSelect(selectValue);
    }
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
      getContainer={getRootContainer}
      onCancel={() => setVisible(false)}
      onOk={handleOkButtonClick}
      title={props.title ?? '测试管理选择'}
      className={cx('modal')}
      visible={visible}
    >
      <p className={cx('hint')}>请输入并从列表中选择已存在的事项</p>
      <div ref={debounceSelectContainerRef}>
        <DebounceSelect
          mode="multiple"
          value={selectValue}
          className={cx('select')}
          fetchOptions={getTestEntityByName}
          filterOptions={filterOptions}
          onChange={value => setSelectValue(value)}
          placeholder={props.placeholder ?? '选择事项'}
          getPopupContainer={() => debounceSelectContainerRef.current}
        />
      </div>
    </Modal>
  );
};

export default React.memo(TestEntitySelector);
