import { useRequest, useSafeState } from 'ahooks';
import { Button, message, Select } from 'antd';
import { components } from 'proxima-sdk';
import React from 'react';

import { getTopItemTypeFromHierarchy } from '@/lib/api/proxima';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import { useCurrentTestConfig, useDataContext } from '../hooks';

const { ItemIcon } = components.Components.Common;

import cx from './index.less';

const TestTypes = [
  {
    type: TestType.Case,
    title: 'testCase',
  },
  {
    type: TestType.Plan,
    title: 'testPlan',
  },
  {
    type: TestType.Execution,
    title: 'testExecution',
  },
];

const ItemTypeMapping = () => {
  const { t } = useI18n();
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
      const uniqueItemTypes = Object.values(
        itemTypes.reduce((set, itemType) => ({ ...set, [itemType.key]: itemType }), {}),
      );
      setTopItemTypes(uniqueItemTypes ?? []);
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
            <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '0.5em' }}>
              ({itemType.key})
            </span>
          </span>
        ),
        value: itemType.key,
        searchValue: itemType.key + itemType.name,
      }));
      const selectedItemType = itemTypeMapping[type];
      return (
        <Select
          showSearch
          optionFilterProp="searchValue"
          options={options}
          disabled={isolatedSystem}
          onChange={val => {
            setItemTypeMapping(prev => ({
              ...prev,
              [type]: val,
            }));
          }}
          value={selectedItemType}
          placeholder={t('common.pleaseSelectType')}
          className={cx('item-type-selector')}
        ></Select>
      );
    },
    [topItemTypes, itemTypeMapping, isolatedSystem, setItemTypeMapping, t],
  );

  // 保存
  const handleSave = async () => {
    await testConfig?.save({
      itemTypeMap: itemTypeMapping,
    });

    message.success(t('page.config.itemTypeMapping.typeAssociationConfigurationSavedSuccessfully'));
  };

  return (
    <div className={cx('test-type-mapping')}>
      {TestTypes.map(({ title, type }) => (
        <div className={cx('test-type-mapping-item')} key={type}>
          <h3>{t(`common.${title}`)}</h3>
          {renderItemTypeSelector(type)}
        </div>
      ))}
      <Button
        disabled={Object.keys(itemTypeMapping).length === 0 || isolatedSystem}
        type="primary"
        className={cx('action-btn')}
        onClick={handleSave}
      >
        {t('common.save')}
      </Button>
    </div>
  );
};

export default ItemTypeMapping;
