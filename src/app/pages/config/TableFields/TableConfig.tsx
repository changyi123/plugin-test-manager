import React, { useCallback } from 'react';
import { BusinessTable } from '@/components/common/BusinessTable';
import { TestType } from '@/lib/constants';
import { useDataContext } from '../hooks';
import { TableFields } from './index';

interface TableConfigProps {
  testType: TestType;
  name;
  tableFieldsData?: TableFields;
  tableActionRef?: any;
  setTableFieldsData?: (val: TableFields) => void;
  colums?: any[];
  defaultColumnKey?: string[];
  isCheckedGlobalConfig?: boolean;
}

const TableConfig: React.FC<TableConfigProps> = ({
  testType,
  name,
  colums,
  defaultColumnKey,
  tableFieldsData,
  tableActionRef,
  setTableFieldsData,
  isCheckedGlobalConfig,
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
      columns={colums}
      name={name}
      handleFilterField={handleFilterField}
      showPagination={false}
    />
  );
};

export default TableConfig;
