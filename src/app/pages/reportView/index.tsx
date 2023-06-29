import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { genChartGroupPageUrl } from '@/lib/testReport';
import { useTestReportByObjectId } from '@/services/testReport/query';

import ReportStatus from '../report/ReportStatus';
import cx from './index.less';
import TestIframe from './TestIframe';

const ReportView: React.FC = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const testReportId = searchParams.get('testReportId');
  const redirectLink = decodeURIComponent(searchParams.get('redirectLink') || '');

  const { data: reportData } = useTestReportByObjectId(testReportId);
  const { t } = useTranslation();
  // 后退
  const goBack = () => {
    window.open(redirectLink, '_self');
  };

  return (
    <div className={cx('report-box')}>
      <>
        <div className={cx('report-header')}>
          <div className={cx('report-header-title')}>
            {redirectLink && <ArrowLeftOutlined className={cx('icon')} onClick={() => goBack()} />}
            <span className={cx('title')}>{reportData?.name}</span>
          </div>
          <Space>
            <Button>{t('report.export')}</Button>
          </Space>
        </div>
        <div className={cx('report-body')}>
          <div className={cx('report-overview')}>
            <div className={cx('title')}>
              <div className={cx('info')}>
                <div className={cx('name')}>{reportData?.name}</div>
                <ReportStatus status={reportData?.reportStatus} />
              </div>
            </div>
            <div className={cx('overview')}>{/* TODO 概览信息 */}</div>
          </div>
          <div className={cx('report-iframe')}>
            <TestIframe
              src={genChartGroupPageUrl({ chartGroupId: reportData?.chartGroup?.objectId })}
            />
          </div>
        </div>
      </>
    </div>
  );
};

export default React.memo(ReportView);
