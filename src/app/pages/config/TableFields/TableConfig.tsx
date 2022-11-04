import React, { useCallback } from 'react';
import { BusinessTable } from '@/components/common/BusinessTable';
import { TestType } from '@/lib/constants';
import { useCurrentTestConfig, useDataContext } from '../hooks';
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
  const testConfig = useCurrentTestConfig(workspace.key);

  const handleFilterField = useCallback(
    ({ key, action }) => {
      let serachFields;
      if (action === 'add') {
        serachFields = (
          tableFieldsData?.[testType]?.serachFields ??
          testConfig?.get('tableFields')?.[testType]?.serachFields ??
          []
        ).concat(key);
      }
      if (action === 'delete') {
        serachFields = (
          tableFieldsData?.[testType]?.serachFields ??
          testConfig?.get('tableFields')?.[testType]?.serachFields ??
          []
        ).filter(d => d !== key);
      }

      setTableFieldsData({
        ...(tableFieldsData ?? {}),
        [testType]: {
          ...(tableFieldsData?.[testType] ?? {}),
          serachFields,
        },
      });
    },
    [setTableFieldsData, tableFieldsData, testConfig, testType],
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
