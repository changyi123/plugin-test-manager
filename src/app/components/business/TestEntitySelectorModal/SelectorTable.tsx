import React, { useCallback, useRef, useState } from 'react';
import useI18n from '@/lib/hooks/useI18n';
import { TestType } from '@/lib/constants';
import { getTestEntityByQuery } from '@/lib/api/item';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { Button } from 'antd';
import FilterSearch from '@/components/common/FilterSearch';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { getFilterFields } from '@/components/common/FilterSearch/utils';

import cx from './SelectorTable.less';

type SelectorTable = {
  workspaceKeyCondition?: string;
  workspaceKey?: string;
  ignoreTestEntityIds?: string[];
  testType?: TestType;
  getDataSource?: (val: any) => any;
};

const SelectorTable: React.FC<SelectorTable> = ({
  workspaceKey,
  workspaceKeyCondition,
  testType,
  ignoreTestEntityIds,
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
        ascending: ['sortIndex', 'createdAt'],
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
    [workspaceKeyCondition, ignoreTestEntityIds, testType],
  );

  const columns = [
    {
      key: 'title',
      title: t('common.title'),
      width: 200,
      render(_, rowData) {
        return <span>{rowData.name}</span>;
      },
    },
    {
      key: 'key',
      title: 'key',
      width: 200,
      render(_, rowData) {
        return <span>{rowData.key}</span>;
      },
    },
  ];

  const handleSelectorSearch = async selector => {
    setSelector(selector);
    // 添加筛选项目需要重置批量选中的 row
    tableActionRef.current.resetSelectedRowKeys();
    tableActionRef.current.refresh();
    // await refreshTable();
  };

  return (
    <div className={cx('model-select')}>
      <div>
        <FilterSearch
          className={cx('filter-search-box')}
          onSearch={handleSelectorSearch}
          fields={getFilterFields([].concat(SystemFieldKeys, []))}
          extendFields={[]}
          testType={TestType.Case}
        />
      </div>
      <Button onClick={() => tableActionRef?.current?.toggleSelection(true)}>1111</Button>
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
      />
    </div>
  );
};

export default SelectorTable;
