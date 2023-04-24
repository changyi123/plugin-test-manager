import React, { useCallback, useEffect, useRef, useState } from 'react';
import useI18n from '@/lib/hooks/useI18n';
import { TestType } from '@/lib/constants';
import { getTestEntityByQuery } from '@/lib/api/item';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import FilterSearch from '@/components/common/FilterSearch';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { getFilterFields } from '@/components/common/FilterSearch/utils';

import cx from './SelectorTable.less';

type SelectorTable = {
  workspaceKeyCondition?: string;
  workspaceKey?: string;
  ignoreTestEntityIds?: string[];
  testType?: TestType;
  selectValue?: string[];
  setSelectValue?: (val?: string[]) => void;
};

const SelectorTable: React.FC<SelectorTable> = ({
  workspaceKey,
  workspaceKeyCondition,
  testType,
  ignoreTestEntityIds,
  selectValue,
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
          id: {
            operator: 'not in',
            value: ignoreTestEntityIds,
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
    [workspaceKeyCondition, ignoreTestEntityIds, testType, selector],
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
      }, 50);
    }
  }, [tableActionRef]);

  const handleSelectorSearch = async selector => {
    setSelector(selector);
    // 添加筛选项目需要重置批量选中的 row
    tableActionRef.current.resetSelectedRowKeys();
    tableActionRef.current.refresh();
  };

  return (
    <div className={cx('model-select')}>
      <div className={cx('model-select-header')}>
        <FilterSearch
          className={cx('filter-search-box')}
          onSearch={handleSelectorSearch}
          fields={getFilterFields([].concat(SystemFieldKeys, []))}
          extendFields={[]}
          testType={TestType.Case}
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
