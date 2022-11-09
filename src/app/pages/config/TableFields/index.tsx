import React, { useCallback, useRef, useState } from 'react';
import { TestType } from '@/lib/constants';
import { Button, Checkbox, message, Spin } from 'antd';
import { useCurrentTestConfig, useDataContext } from '../hooks';
import TableConfig from './TableConfig';
import { updateAllTestConfigs, updateGlobalConfig } from '@/lib/api/common';
import { BusinessTableActionType } from '@/components/common/BusinessTable';

import cx from './style.less';

export interface TableFields {
  TestCase?: FieldKeys;
  TestPlan?: FieldKeys;
}

export interface FieldKeys {
  tableColumns?: string[];
  serachFields?: string[];
}

const TableFields: React.FC = () => {
  const { workspace, globalConfig, refreshGlobalConfig } = useDataContext();
  const testPlanRef = useRef<BusinessTableActionType>();
  const testCaseRef = useRef<BusinessTableActionType>();
  const testConfig = useCurrentTestConfig(workspace?.key);
  const [tableFieldsData, setTableFieldsData] = useState<TableFields | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(globalConfig?.tableFields?.checked);

  const defaultPlanColumnKey = [
    'status',
    'caseCount',
    'assignee',
    'createdAt',
    'createdBy',
    'caseStatus',
  ];

  const defaultCaseColumnKey = ['key', 'repositoryGroup', 'createdBy', 'createdAt'];

  const saveConfig = useCallback(async () => {
    setLoading(true);
    const getFields = type =>
      checked
        ? globalConfig?.tableFields?.[type]?.serachFields
        : testConfig.get('tableFields')?.[type]?.serachFields;

    const fields = {
      [TestType.Plan]: {
        serachFields: getFields(TestType.Plan),
        ...(tableFieldsData?.[TestType.Plan] ?? {}),
        tableColumns: (testPlanRef?.current?.tableColumns ?? []).map(d => d.key),
      },
      [TestType.Case]: {
        serachFields: getFields(TestType.Case),
        ...(tableFieldsData?.[TestType.Case] ?? {}),
        tableColumns: (testCaseRef?.current?.tableColumns ?? []).map(d => d.key),
      },
    };
    if (!checked) {
      if (globalConfig?.tableFields?.checked) {
        await updateGlobalConfig({
          tableFields: {
            ...(globalConfig?.tableFields ?? {}),
            checked,
          },
        });
        refreshGlobalConfig();
      }
      await testConfig.save({
        tableFields: fields,
      });
    } else {
      await updateGlobalConfig({
        tableFields: {
          checked,
          ...fields,
        },
      });
      await updateAllTestConfigs({
        tableFields: fields,
      });
      refreshGlobalConfig();
    }
    message.success('表头及检索项配置保存成功');
    setLoading(false);
  }, [tableFieldsData, checked, globalConfig?.tableFields, testConfig, refreshGlobalConfig]);

  const testPlanColumns: any[] = [
    {
      width: 60,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: '计划名称',
    },
    {
      key: 'caseStatus',
      title: '执行通过率',
      width: 80,
    },
    {
      key: 'caseCount',
      title: '规划用例数',
      width: 80,
    },
    {
      title: null,
      key: 'action',
      isSystem: true,
      fixed: 'right' as any,
      width: 50,
    },
  ];

  const caseColumns = [
    {
      width: 60,
      key: 'title',
      title: '标题',
      isSystem: true,
    },
    {
      key: 'repositoryGroup',
      title: '所属模块',
      width: 60,
    },
    {
      title: null,
      key: 'action',
      isSystem: true,
      fixed: 'right' as any,
      width: 50,
    },
  ];

  return (
    <Spin spinning={loading}>
      <div className={cx('table-fields')}>
        <Checkbox
          className={cx('check-box')}
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
        >
          全部空间
        </Checkbox>
        <div className={cx('setting-box')}>
          <div className={cx('title')}>测试计划-表头</div>
          <div className={cx('setting-table', 'plan')}>
            <TableConfig
              testType={TestType.Plan}
              name="testPlanTableConfig"
              tableFieldsData={tableFieldsData}
              setTableFieldsData={setTableFieldsData}
              tableActionRef={testPlanRef}
              colums={testPlanColumns}
              defaultColumnKey={
                checked
                  ? globalConfig?.tableFields?.[TestType.Plan]?.tableColumns
                  : defaultPlanColumnKey
              }
              isCheckedGlobalConfig={checked}
            />
          </div>
        </div>
        <div className={cx('setting-box', 'mg-top-m')}>
          <div className={cx('title')}>测试用例-表头</div>
          <div className={cx('setting-table', 'case')}>
            <TableConfig
              testType={TestType.Case}
              name="testCaseTableConfig"
              tableFieldsData={tableFieldsData}
              setTableFieldsData={setTableFieldsData}
              tableActionRef={testCaseRef}
              colums={caseColumns}
              defaultColumnKey={
                checked
                  ? globalConfig?.tableFields?.[TestType.Case]?.tableColumns
                  : defaultCaseColumnKey
              }
              isCheckedGlobalConfig={checked}
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
