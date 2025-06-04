import { Select } from 'antd';
import { components } from 'proxima-sdk';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { TestType } from '@/lib/constants';
import { commonQuery } from '@/services/query';

import cx from './style.less';

const { ItemIcon } = components.Components.Common;

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
  {
    type: TestType.CaseSet,
    title: 'testCaseSet',
  },
  {
    type: TestType.Report,
    title: 'testReport',
  },
];

const TestTypeMappingSelector: React.FC<any> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const { data: allItemTypes = [] } = commonQuery.useAllItemTypes();

  const renderItemTypeSelector = type => {
    const options = allItemTypes.map(itemType => ({
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
    const selectedItemType = value?.[type];

    return (
      <Select
        showSearch
        options={options}
        optionFilterProp="searchValue"
        onChange={val => {
          onChange({
            ...value,
            [type]: val,
          });
        }}
        value={selectedItemType}
        placeholder={t('common.pleaseSelectType')}
        className={cx('item-type-selector')}
      />
    );
  };

  return (
    <div className={cx('test-type-mapping')}>
      {TestTypes.map(({ title, type }) => (
        <div className={cx('test-type-mapping-item')} key={type}>
          <h3>{t(`common.${title}`)}</h3>
          {renderItemTypeSelector(type)}
        </div>
      ))}
    </div>
  );
};

export default React.memo(TestTypeMappingSelector);
