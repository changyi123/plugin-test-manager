import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { Button, notification, Space, Spin } from 'antd';
import isEmpty from 'lodash/isEmpty';
import React, { useCallback, useRef } from 'react';

import { ControlOutlined, PlusOutlined } from '@/icons';
import { featureFlags, SupportFeatureFlags } from '@/lib/appEnv';
import { TestExecutionModel, TestPlanModel } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { selectorToIql } from '@/lib/utils/iql';
import { TestReport } from '@/services/models';
import { testConfigQuery } from '@/services/query';
import { generateTestReportOfflineFile } from '@/services/testReport/service';

import CreateReportModel, { ActionType } from '../../Model/createReportModel';
import ReportTemplateModal, {
  ActionType as ReportTemplateModalActionType,
} from '../../ReportTemplateModal';
import cx from './index.less';

const handleSelector = (selector, key) => {
  if (isEmpty(selector)) return null;
  const selectors = {} as Record<string, any>;
  if (selector) {
    // 处理测试用例库筛选字段
    selectors[key] = {
      ...selector,
      component: 'Dropdown',
      fieldName: 'id',
    };
  }
  return {
    ...selectors,
  };
};

const getReportOverviewData = selectors => {
  const getSelectorDataGetters = type => {
    switch (type) {
      case TestPlanModel:
        return selector => {
          if (!selector?.value) return null;
          return {
            testPlan: selector?.value?.map(i => i.value).filter(Boolean),
          };
        };
      case TestExecutionModel:
        return selector => {
          if (!selector?.value) return null;
          return {
            testExecution: selector?.value?.map(i => i.value).filter(Boolean),
          };
        };
      default:
        return selector => {
          if (!selector?.value) return null;
          return {
            [selector.key]: selector?.value?.map(i => i?.value ?? i?.id).filter(Boolean),
          };
      }
    }
  };

  return Object.values(selectors ?? {}).reduce((res: any, selector: any) => {
    return {
      ...res,
      ...(getSelectorDataGetters(selector.key)(selector) ?? {}),
    };
  }, {});
};

const ReportHeader: React.FC<any> = () => {
  const modalRef = useRef<ActionType>();
  const reportTemplateModalActionRef = useRef<ReportTemplateModalActionType>();
  const enableOfflineReport = React.useMemo(
    () => featureFlags(SupportFeatureFlags.ENABLE_OFFLINE_TEST_REPORT),
    [],
  );

  const { t } = useI18n();
  const { workspace, config } = useTestConfig();

  const openReportTemplateModal = () => {
    reportTemplateModalActionRef.current.open();
  };

  const createReport = useCallback(async () => {
    const res: any = await modalRef.current.open({});
    if (!res.template?.objectId) return;

    notification.open({
      message: t('report.createLoading'),
      icon: <Spin spinning={true} />,
      duration: null,
    });
    const iqlMap = Object.entries(res.selectors ?? {}).reduce((prev, [key, value]: any[]) => {
      prev[value.key] = selectorToIql(
        [TestPlanModel, TestExecutionModel].includes(key)
          ? handleSelector(value, key)
          : { key: value },
      );
      return prev;
    }, {});
    const testReport = new TestReport();
    const reportInfo = await testReport.createReport(res.template.objectId, {
      name: res.name,
      reportStatus: res.reportStatus,
      reportOverviewData: getReportOverviewData(res.selectors),
      dataSourceIql: iqlMap,
      workspace: workspace,
      defectsMapping: config?.defectsMapping,
      itemTypeMap: config?.itemTypeMap,
    });
    notification.destroy();

    console.info('create test report success!', reportInfo);
    // 生成测试报告离线文档
    enableOfflineReport && (await generateTestReportOfflineFile(reportInfo?.data?.objectId));

    if (reportInfo.status === 'success') {
      const proxima = createProximaSdk();
      proxima.execute('refreshTestReportTable', reportInfo?.data?.objectId);
      notification.success({
        message: `${t('report.testReport')}【${res.name}】${t('report.addSuccess')}`,
      });
    } else {
      notification.error({
        message: `${t('report.testReport')}【${res.name}】${t('report.addFail')}`,
      });
    }
  }, [t, workspace, config?.defectsMapping, config?.itemTypeMap, enableOfflineReport]);

  const { data: globalConfig } = testConfigQuery.useGlobalTestConfig();

  const enableWorkspaceReportTemplate = globalConfig?.extra?.enableWorkspaceReportTemplate ?? false;

  return (
    <>
      <div className={cx('report-header')}>
        <div className={cx('report-title')}>{t('common.testReport')}</div>
        <Space>
          {enableWorkspaceReportTemplate && (
            <Button icon={<ControlOutlined />} onClick={() => openReportTemplateModal()}>
              {t('report.templateSet')}
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={createReport}>
            {t('report.addReport')}
          </Button>
        </Space>
      </div>

      <ReportTemplateModal workspace={workspace} actionRef={reportTemplateModalActionRef} />
      <CreateReportModel actionRef={modalRef} workspace={workspace}></CreateReportModel>
    </>
  );
};

export default React.memo(ReportHeader);
