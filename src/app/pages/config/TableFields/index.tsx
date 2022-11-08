import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TestType } from '@/lib/constants';
import { Button, message, Spin } from 'antd';
import { useCurrentTestConfig, useDataContext } from '../hooks';
import TableConfig from './TableConfig';

import cx from './style.less';
import { updateAllTestConfigs } from '@/lib/api/common';
import { BusinessTableActionType } from '@/components/common/BusinessTable';

export interface TableFields {
  TestCase?: FieldKeys;
  TestPlan?: FieldKeys;
}

export interface FieldKeys {
  tableColumns?: string[];
  serachFields?: string[];
}

const TableFields: React.FC = () => {
  const { workspace, checkAllWorkspace, setShowAllWorkspaceCheck } = useDataContext();
  const testPlanRef = useRef<BusinessTableActionType>();
  const testCaseRef = useRef<BusinessTableActionType>();
  const testConfig = useCurrentTestConfig(workspace?.key);
  const [tableFieldsData, setTableFieldsData] = useState<TableFields | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setShowAllWorkspaceCheck(true);
    return () => {
      setShowAllWorkspaceCheck(false);
    };
  }, [setShowAllWorkspaceCheck]);

  const saveConfig = useCallback(async () => {
    setLoading(true);
    const fields = {
      TestPlan: {
        ...(testConfig.get('tableFields')?.TestPlan ?? {}),
        ...(tableFieldsData?.TestPlan ?? {}),
        tableColumns: (testPlanRef?.current?.tableColumns ?? []).map(d => d.key),
      },
      TestCase: {
        ...(testConfig.get('tableFields')?.TestCase ?? {}),
        ...(tableFieldsData?.TestCase ?? {}),
        tableColumns: (testCaseRef?.current?.tableColumns ?? []).map(d => d.key),
      },
    };
    if (!checkAllWorkspace) {
      await testConfig.save({
        tableFields: fields,
      });
    } else {
      await updateAllTestConfigs({
        tableFields: fields,
      });
    }
    message.success('表头及检索项配置保存成功');
    setLoading(false);
  }, [tableFieldsData, testConfig, checkAllWorkspace]);

  return (
    <Spin spinning={loading}>
      <div className={cx('table-fields')}>
        {/* <div className={cx('check-box')}>
          <Checkbox onChange={() => setCheckBox(x => !x)}>应用到全部空间</Checkbox>
        </div> */}
        <div className={cx('setting-box')}>
          <div className={cx('title')}>测试计划-表头</div>
          <div className={cx('table', 'plan')}>
            <TableConfig
              testType={TestType.Plan}
              name="testPlanTableConfig"
              tableFieldsData={tableFieldsData}
              setTableFieldsData={setTableFieldsData}
              tableActionRef={testPlanRef}
            />
          </div>
        </div>
        <div className={cx('setting-box', 'mg-top-m')}>
          <div className={cx('title')}>测试用例-表头</div>
          <div className={cx('table', 'case')}>
            <TableConfig
              testType={TestType.Case}
              name="testCaseTableConfig"
              tableFieldsData={tableFieldsData}
              setTableFieldsData={setTableFieldsData}
              tableActionRef={testCaseRef}
            />
          </div>
        </div>
        <Button type="primary" className={cx('action-btn')} onClick={saveConfig}>
          保存
        </Button>
      </div>
    </Spin>
  );
};

export default TableFields;
