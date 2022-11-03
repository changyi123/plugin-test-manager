import React, { useCallback, useRef } from 'react';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { TestType } from '@/lib/constants';
import { useCurrentTestConfig, useDataContext } from '../hooks';
import { TableFields } from './index';

interface TableConfigProps {
  testType: TestType;
  name;
  tableFieldsData?: TableFields;
  setTableFieldsData?: (val: TableFields) => void;
}

const TableConfig: React.FC<TableConfigProps> = ({
  testType,
  name,
  tableFieldsData,
  setTableFieldsData,
}) => {
  const { workspace } = useDataContext();
  const testConfig = useCurrentTestConfig(workspace.key);
  const tableActionRef = useRef<BusinessTableActionType>();

  const handleFilterField = useCallback(
    ({ key, action }) => {
      const tableColumns = (tableActionRef.current.tableColumns ?? []).map(d => d.key);

      let serachFields;
      if (action === 'add') {
        serachFields = (tableFieldsData ?? testConfig.tableFilelds?.[testType]).concat(key);
      }
      if (action === 'delete') {
        serachFields = (tableFieldsData ?? testConfig.tableFilelds?.[testType]).filter(
          d => d !== key,
        );
      }

      setTableFieldsData({
        ...tableFieldsData,
        [testType]: {
          serachFields,
          tableColumns,
        },
      });
    },
    [setTableFieldsData, tableFieldsData, testConfig.tableFilelds, testType],
  );

  return (
    <BusinessTable
      titleCellOption={{
        workspaceKey: workspace?.key,
        testType: testType,
      }}
      useColumnSetting
      actionRef={tableActionRef}
      columns={[]}
      dataSource={[]}
      name={name}
      handleFilterField={handleFilterField}
    />
  );
};

export default TableConfig;
