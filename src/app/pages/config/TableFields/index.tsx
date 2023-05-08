import { Button, message, Spin } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { BusinessTableActionType } from '@/components/common/BusinessTable';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import { updateAllTestConfigs, updateGlobalConfig } from '@/lib/api/common';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import { useCurrentTestConfig, useDataContext } from '../hooks';
import cx from './style.less';
import TableConfig from './TableConfig';

export interface TableFields {
  TestCase?: FieldKeys;
  TestPlan?: FieldKeys;
}

export interface FieldKeys {
  tableColumns?: string[];
  serachFields?: string[];
}

const TableFields: React.FC = () => {
  const {
    workspace,
    globalConfig,
    refreshGlobalConfig,
    checkAllWorkspace,
    setShowAllWorkspaceCheck,
  } = useDataContext();
  const { t } = useI18n();
  const testPlanRef = useRef<BusinessTableActionType>();
  const testCaseRef = useRef<BusinessTableActionType>();
  const testConfig = useCurrentTestConfig(workspace?.key);
  const [tableFieldsData, setTableFieldsData] = useState<TableFields | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  // const [checked, setChecked] = useState(globalConfig?.tableFields?.checked);

  const testPlanFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Plan,
    workspaceKey: workspace?.key,
  });

  const testCaseFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Case,
    workspaceKey: workspace?.key,
  });

  useEffect(() => {
    setShowAllWorkspaceCheck(true);

    return () => {
      setShowAllWorkspaceCheck(false);
    };
  }, [setShowAllWorkspaceCheck]);

  const defaultPlanColumnKey = ['status', 'assignee', 'createdAt', 'createdBy'];

  const defaultCaseColumnKey = ['key', 'createdBy', 'createdAt'];

  const saveConfig = useCallback(async () => {
    setLoading(true);
    const getFields = type =>
      checkAllWorkspace
        ? globalConfig?.tableFields?.[type]?.serachFields
        : testConfig.get('tableFields')?.[type]?.serachFields;

    const getColumns = ref => [
      ...new Set(
        (ref?.current?.tableColumns ?? [])
          .map(d => d.key)
          .filter(d => !['action', 'title'].includes(d)),
      ),
    ];

    const fields = {
      [TestType.Plan]: {
        serachFields: getFields(TestType.Plan),
        ...(tableFieldsData?.[TestType.Plan] ?? {}),
        tableColumns: getColumns(testPlanRef),
      },
      [TestType.Case]: {
        serachFields: getFields(TestType.Case),
        ...(tableFieldsData?.[TestType.Case] ?? {}),
        tableColumns: getColumns(testCaseRef),
      },
    };
    if (!checkAllWorkspace) {
      await testConfig.save({
        tableFields: fields,
      });
    } else {
      await updateGlobalConfig({
        tableFields: {
          ...fields,
        },
      });
      await updateAllTestConfigs({
        tableFields: fields,
      });
      refreshGlobalConfig();
    }
    message.success(t('page.config.tableFields.messageSuccess'));
    setLoading(false);
  }, [tableFieldsData, checkAllWorkspace, globalConfig, testConfig, refreshGlobalConfig, t]);

  const testPlanColumns: any[] = [
    {
      width: 60,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: t('page.config.tableFields.planName'),
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
      fixed: true,
      title: t('common.title'),
      isSystem: true,
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
        <div className={cx('setting-box')}>
          <div className={cx('title')}>{t('page.config.tableFields.testPlanHeader')}</div>
          <div className={cx('setting-table', 'plan')}>
            <TableConfig
              testType={TestType.Plan}
              name="testPlanTableConfig"
              tableFieldsData={tableFieldsData}
              setTableFieldsData={setTableFieldsData}
              tableActionRef={testPlanRef}
              columns={testPlanColumns}
              defaultColumnKey={
                checkAllWorkspace
                  ? globalConfig?.tableFields?.[TestType.Plan]?.tableColumns
                  : defaultPlanColumnKey
              }
              isCheckedGlobalConfig={checkAllWorkspace}
              testFieldKeys={testPlanFieldKeys}
            />
          </div>
        </div>
        <div className={cx('setting-box', 'mg-top-m')}>
          <div className={cx('title')}>{t('page.config.tableFields.testCaseHeader')}</div>
          <div className={cx('setting-table', 'case')}>
            <TableConfig
              testType={TestType.Case}
              name="testCaseTableConfig"
              tableFieldsData={tableFieldsData}
              setTableFieldsData={setTableFieldsData}
              tableActionRef={testCaseRef}
              columns={caseColumns}
              defaultColumnKey={
                checkAllWorkspace
                  ? globalConfig?.tableFields?.[TestType.Case]?.tableColumns
                  : defaultCaseColumnKey
              }
              isCheckedGlobalConfig={checkAllWorkspace}
              testFieldKeys={testCaseFieldKeys}
            />
          </div>
        </div>
        <Button type="primary" className={cx('action-btn')} onClick={saveConfig}>
          {t('common.save')}
        </Button>
      </div>
    </Spin>
  );
};

export default TableFields;
