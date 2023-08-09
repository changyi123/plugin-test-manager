import React, { useCallback } from 'react';

import { BusinessTable } from '@/components/dynamicComponents';
import { TestType } from '@/lib/constants';

import { useDataContext } from '../hooks';
import { TableFields } from './index';

interface TableConfigProps {
  testType: TestType;
  name;
  tableFieldsData?: TableFields;
  tableActionRef?: any;
  setTableFieldsData?: (val: TableFields) => void;
  columns?: any[];
  defaultColumnKey?: string[];
  isCheckedGlobalConfig?: boolean;
  testFieldKeys?: string[];
}

const TableConfig: React.FC<TableConfigProps> = ({
  testType,
  name,
  columns,
  defaultColumnKey,
  tableFieldsData,
  tableActionRef,
  setTableFieldsData,
  isCheckedGlobalConfig,
  testFieldKeys,
}) => {
  const { workspace } = useDataContext();
  const handleFilterField = useCallback(
    ({ fieldKeys }) => {
      setTableFieldsData({
        ...(tableFieldsData ?? {}),
        [testType]: {
          ...(tableFieldsData?.[testType] ?? {}),
          serachFields: fieldKeys,
        },
      });
    },
    [setTableFieldsData, tableFieldsData, testType],
  );

  return (
    <BusinessTable
      titleCellOption={{
        workspaceKey: workspace.key,
        testType: testType,
        isSettingPage: true,
        isCheckedGlobalConfig,
      }}
      useColumnSetting
      actionRef={tableActionRef}
      defaultColumnKey={defaultColumnKey}
      columns={columns}
      name={name}
      handleFilterField={handleFilterField}
      showPagination={false}
      testFieldKeys={testFieldKeys}
    />
  );
};

export default TableConfig;
