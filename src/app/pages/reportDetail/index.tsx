import { ArrowLeftOutlined } from '@ant-design/icons';
import { Space } from 'antd';
import React from 'react';

import { useTestConfig } from '@/lib/hooks/useContext';
// import useI18n from '@/lib/hooks/useI18n';
import { genChartGroupPageUrl } from '@/lib/testReport';
import { getProximaBasePath, getTenantKey } from '@/lib/utils/helper';
import { useTestReportByObjectId } from '@/services/testReport/query';

import ReportStatus from '../report/ReportStatus';
import cx from './index.less';
import TestIframe from './TestIframe';

const ReportDetail: React.FC<any> = ({ chartGroupId }) => {
  // const { t } = useI18n();
  const { workspace } = useTestConfig();
  const { data: reportData } = useTestReportByObjectId(chartGroupId);

  return (
    <div className={cx('report-box')}>
      {workspace?.key && (
        <>
          <div className={cx('report-header')}>
            <div
              className={cx('report-header-title')}
              onClick={() => {
                const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
                const href = `${baseUrl}/${getTenantKey()}/workspaces/${
                  workspace?.key
                }/plugin/test_manager_test-report`;
                window.open(href, '_blank');
              }}
            >
              <ArrowLeftOutlined className={cx('icon')} />
              <span className={cx('title')}>{reportData?.name}</span>
            </div>
            <Space>{/* <Button>{t('report.export')}</Button> */}</Space>
          </div>
          <div className={cx('report-body')}>
            <div className={cx('report-overview')}>
              <div className={cx('title')}>
                <div className={cx('info')}>
                  <div className={cx('name')}>{reportData?.name}</div>
                  <ReportStatus status={reportData?.reportStatus} />
                </div>
                {/* <div className={cx('icon-box')}>
              <EditOutlined className={cx('editor-icon')} />
            </div> */}
              </div>
              <div className={cx('overview')}>{/* TODO 概览信息 */}</div>
            </div>
            <div className={cx('report-iframe')}>
              <TestIframe
                src={
                  genChartGroupPageUrl({ chartGroupId: reportData?.chartGroup?.objectId })
                  // 'http://localhost:3000/inspur/workspaces/LPTEST01/report/test_manager?disabledCreate=true&displayContext=test_manager'
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(ReportDetail);
