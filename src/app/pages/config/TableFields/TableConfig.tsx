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
}

const TableConfig: React.FC<TableConfigProps> = ({
  testType,
  name,
  tableFieldsData,
  tableActionRef,
  setTableFieldsData,
}) => {
  const { workspace }: any = useDataContext();
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
      }}
      useColumnSetting
      actionRef={tableActionRef}
      columns={[]}
      dataSource={[]}
      name={name}
      handleFilterField={handleFilterField}
      showPagination={false}
      isSettingPage={true}
    />
  );
};

export default TableConfig;
