import { PlusOutlined } from '@ant-design/icons';
import { Button, notification, Spin } from 'antd';
import isEmpty from 'lodash/isEmpty';
import React, { useCallback, useRef } from 'react';

import { TestPlanModel } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { selectorToIql } from '@/lib/utils/iql';
import { TestReport } from '@/services/models';

import CreateReportModel, { ActionType } from '../../Model/createReportModel';
import cx from './index.less';

const handleSelector = selector => {
  if (isEmpty(selector)) return null;
  const selectors = {} as Record<string, any>;
  if (selector) {
    // 处理测试用例库筛选字段
    selectors[TestPlanModel] = {
      ...selector,
      component: 'Dropdown',
      fieldName: 'id',
    };
  }
  return {
    ...selectors,
  };
};

const getLinkPlanId = selector => {
  if (!selector?.[TestPlanModel]) return null;
  return selector[TestPlanModel].value.map(d => d.value);
};

const ReportHeader: React.FC<any> = () => {
  const modalRef = useRef<ActionType>();
  const { t } = useI18n();
  const { workspace, config } = useTestConfig();

  const createReport = useCallback(async () => {
    const res: any = await modalRef.current.open({});
    if (!res.template?.objectId) return;

    notification.open({
      message: '测试报告创建中...',
      icon: <Spin spinning={true} />,
      duration: null,
    });
    const iqlMap = Object.entries(res.selectors ?? {}).reduce((prev, [key, value]: any[]) => {
      prev[value.key] = selectorToIql(
        key === TestPlanModel ? handleSelector(value) : { key: value },
      );
      return prev;
    }, {});
    const testReport = new TestReport();
    const reportInfo = await testReport.createReport(res.template.objectId, {
      name: res.name,
      reportStatus: res.reportStatus,
      reportOverviewData: { ...res.reportOverviewData, linkPlanId: getLinkPlanId(res.selectors) },
      dataSourceIql: iqlMap,
      workspace: workspace,
      defectsMapping: config?.defectsMapping,
    });
    notification.destroy();
    if (reportInfo.status === 'success') {
      notification.success({
        message: `测试报告【${res.name}】创建成功`,
      });
    } else {
      notification.error({
        message: `测试报告【${res.name}】创建失败`,
      });
    }
  }, [config?.defectsMapping, workspace]);

  return (
    <>
      <div className={cx('report-header')}>
        <div className={cx('report-title')}>{t('common.testReport')}</div>
        <div>
          <Button type="primary" icon={<PlusOutlined />} onClick={createReport}>
            {t('report.addReport')}
          </Button>
        </div>
      </div>

      <CreateReportModel actionRef={modalRef} workspace={workspace}></CreateReportModel>
    </>
  );
};

export default React.memo(ReportHeader);
