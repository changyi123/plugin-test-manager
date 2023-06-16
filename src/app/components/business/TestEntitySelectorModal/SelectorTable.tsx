import React, { useCallback, useEffect, useRef, useState } from 'react';

import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { BusinessTable } from '@/components/dynamicComponents';
import { getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import cx from './SelectorTable.less';

type SelectorTable = {
  workspaceKeyCondition?: string;
  workspaceKey?: string;
  ignoreTestEntityIds?: string[];
  testType?: TestType;
  selectValue?: string[];
  setSelectValue?: (val?: string[]) => void;
  tableFieldsKeys?: string[];
};

const SelectorTable: React.FC<SelectorTable> = ({
  workspaceKey,
  workspaceKeyCondition,
  testType,
  selectValue,
  tableFieldsKeys,
  setSelectValue,
}) => {
  const { t } = useI18n();
  const tableActionRef = useRef<BusinessTableActionType>();
  const [loading, setLoading] = useState(false);
  const [selector, setSelector] = React.useState(null);

  const tableDataGetter = useCallback(
    async (params = {}) => {
      setLoading(true);
      const { list, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKeyCondition,
          type: testType,
          linkType: {
            operator: 'is',
            value: null,
          } as any,
        },
        descending: ['sortIndex', 'createdAt'],
        selector,
        ...params,
      });
      setLoading(false);

      return {
        list: list.map(d => ({
          ...d,
          status: d.workflowStatus,
        })),
        total,
      };
    },
    [workspaceKeyCondition, testType, selector],
  );

  const columns = [
    {
      key: 'title',
      title: t('common.title'),
      width: 120,
      render(_, rowData) {
        return <span>{rowData.name}</span>;
      },
    },
    {
      key: 'key',
      title: 'key',
      width: 80,
      render(_, rowData) {
        return <span>{rowData.key}</span>;
      },
    },
  ];

  useEffect(() => {
    if (tableActionRef.current?.toggleSelection) {
      setTimeout(() => {
        tableActionRef.current.toggleSelection(true);
      }, 500);
    }
  }, [tableActionRef]);

  const handleSelectorSearch = async selector => {
    setSelector(selector);
    // 添加筛选项目需要重置批量选中的 row
    tableActionRef.current?.resetSelectedRowKeys();
    tableActionRef.current?.refresh();
  };

  return (
    <div className={cx('model-select')}>
      <div className={cx('model-select-header')}>
        <FilterSearch
          className={cx('filter-search-box')}
          onSearch={handleSelectorSearch}
          fields={getFilterFields([].concat(SystemFieldKeys, tableFieldsKeys ?? []))}
          checkedFields={['assignee', 'status']}
          testType={TestType.Case}
          filterId={'model-filter-btn'}
          storageKey={'model-link-execution'}
        />
      </div>
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: TestType.Execution,
        }}
        rowKey="objectId"
        useColumnSetting
        columns={columns}
        loading={loading}
        defaultColumnKey={['title', 'key', 'assignee', 'status']}
        name={`selectModel_TestDetailTable`}
        actionRef={tableActionRef}
        getDataSource={tableDataGetter}
        setCheckedRowKeys={setSelectValue}
        testFieldKeys={[].concat(SystemFieldKeys, tableFieldsKeys ?? [])}
      />
      <span className={cx('checked-num')}>
        <span>{t('common.checked')} </span>
        <span className={cx('num')}>{selectValue?.length ?? 0}</span>
        <span>{t('common.runNum')}</span>
      </span>
    </div>
  );
};

export default SelectorTable;
