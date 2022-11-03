import React, { useCallback, useState } from 'react';
import { TestType } from '@/lib/constants';
import { Button, Checkbox, message, Spin } from 'antd';
import { useCurrentTestConfig, useDataContext } from '../hooks';
import TableConfig from './TableConfig';

import cx from './style.less';
import { updateAllTestConfigs } from '@/lib/api/common';

export interface TableFields {
  testCase?: FieldKeys;
  testPlan?: FieldKeys;
}

export interface FieldKeys {
  tableColumns?: string[];
  serachFields?: string[];
}

const TableFields: React.FC = () => {
  const { workspace } = useDataContext();
  const testConfig = useCurrentTestConfig(workspace?.key);
  const [checkBox, setCheckBox] = useState(false);
  const [tableFieldsData, setTableFieldsData] = useState<TableFields | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const saveConfig = useCallback(async () => {
    setLoading(true);
    if (!checkBox) {
      await testConfig.save({
        tableFields: tableFieldsData,
      });
    } else {
      await updateAllTestConfigs({
        tableFields: tableFieldsData,
      });
    }
    message.success('表头及检索项配置保存成功');
    setLoading(false);

    // const;
  }, [tableFieldsData, testConfig, checkBox]);

  return (
    <Spin spinning={loading}>
      <div className={cx('table-fields')}>
        <div className={cx('check-box')}>
          <Checkbox onChange={() => setCheckBox(x => !x)}>应用到全部空间</Checkbox>
        </div>
        <div className={cx('setting-box')}>
          <div className={cx('title')}>测试计划</div>
          <div className={cx('table', 'plan')}>
            <TableConfig
              testType={TestType.Plan}
              name="testPlanTableConfig"
              tableFieldsData={tableFieldsData}
              setTableFieldsData={setTableFieldsData}
            />
          </div>
        </div>
        <div className={cx('setting-box')}>
          <div className={cx('title')}>测试用例</div>
          <div className={cx('table', 'case')}></div>
        </div>
        <Button type="primary" className={cx('action-btn')} onClick={saveConfig}>
          保存
        </Button>
      </div>
    </Spin>
  );
};

export default TableFields;
