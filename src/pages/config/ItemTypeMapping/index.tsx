import React from 'react';
import { TestType } from '@/lib/constants';
import { Select, Button, message } from 'antd';
import { useRequest, useSafeState } from 'ahooks';
import { useDataContext, useCurrentTestConfig } from '../hooks';
import { getTopItemTypeFromHierarchy } from '@/lib/api/proxima';
import { components } from 'proxima-sdk';

const { ItemIcon } = components.Components.Common;

import cx from './index.less';

const TestTypes = [
  {
    type: TestType.TestDetail,
    title: '测试用例',
  },
  {
    type: TestType.TestPlan,
    title: '测试计划',
  },
  {
    type: TestType.TestExecution,
    title: '测试执行任务',
  },
];

const ItemTypeMapping = () => {
  const { workspace, globalConfig } = useDataContext();
  const isolatedSystem = Boolean(globalConfig?.extra?.isolatedSystem);
  const workspaceKey = workspace?.key;
  const workspaceId = workspace?.objectId;

  const [topItemTypes, setTopItemTypes] = useSafeState([]);
  const [itemTypeMapping, setItemTypeMapping] = useSafeState({} as Record<TestType, string>);

  useRequest(() => getTopItemTypeFromHierarchy(workspaceId), {
    ready: !!workspaceId,
    refreshDeps: [workspaceId],
    onSuccess(itemTypes) {
      setTopItemTypes(itemTypes);
    },
  });

  const testConfig = useCurrentTestConfig(workspaceKey);

  React.useEffect(() => {
    const data = testConfig?.toJSON();
    setItemTypeMapping(data?.itemTypeMap ?? {});
  }, [setItemTypeMapping, testConfig]);

  const renderItemTypeSelector = React.useCallback(
    type => {
      const options = topItemTypes.map(itemType => ({
        label: (
          <span className={cx('item-type-selector-label')}>
            <ItemIcon className={cx('icon')} icon={itemType.icon}></ItemIcon>
            <span>{itemType.name}</span>
          </span>
        ),
        value: itemType.key,
      }));
      const selectedItemType = itemTypeMapping[type];
      return (
        <Select
          options={options}
          disabled={isolatedSystem}
          onChange={val => {
            setItemTypeMapping(prev => ({
              ...prev,
              [type]: val,
            }));
          }}
          value={selectedItemType}
          placeholder="请选择事项类型"
          className={cx('item-type-selector')}
        ></Select>
      );
    },
    [topItemTypes, itemTypeMapping, isolatedSystem, setItemTypeMapping],
  );

  // 保存
  const handleSave = async () => {
    await testConfig?.save({
      itemTypeMap: itemTypeMapping,
    });

    message.success('事项类型关联配置保存成功');
  };

  return (
    <div className={cx('test-type-mapping')}>
      {TestTypes.map(({ title, type }) => (
        <div className={cx('test-type-mapping-item')} key={type}>
          <h3>{title}</h3>
          {renderItemTypeSelector(type)}
        </div>
      ))}
      <Button
        disabled={Object.keys(itemTypeMapping).length === 0 || isolatedSystem}
        type="primary"
        className={cx('action-btn')}
        onClick={handleSave}
      >
        保存
      </Button>
    </div>
  );
};

export default ItemTypeMapping;
