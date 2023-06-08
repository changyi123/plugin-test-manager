import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import React from 'react';

import { useTestConfig } from '@/lib/hooks/useContext';
import { getProximaBasePath, getTenantKey } from '@/lib/utils/helper';
import { useTestReportByObjectId } from '@/services/testReport/query';

import ReportStatus from '../report/ReportStatus';
import cx from './index.less';
import TestIframe from './TestIframe';

const ReportDetail: React.FC<any> = ({ chartGroupId }) => {
  const { workspace } = useTestConfig();
  const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
  const { data: reportData } = useTestReportByObjectId(chartGroupId);

  return (
    <div className={cx('report-box')}>
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
          <span className={cx('title')}>测试报告标题</span>
        </div>
        <Space>
          <Button>导出</Button>
        </Space>
      </div>
      <div className={cx('report-body')}>
        <div className={cx('report-overview')}>
          <div className={cx('title')}>
            <div className={cx('info')}>
              <div className={cx('name')}>{reportData?.name}</div>
              <ReportStatus status={reportData?.reportStatus} />
            </div>
            <div className={cx('icon-box')}>
              <EditOutlined className={cx('editor-icon')} />
            </div>
          </div>
          <div className={cx('overview')}>{/* TODO 概览信息 */}</div>
        </div>
        <div className={cx('report-iframe')}>
          {/* &hiddenSider=true&hiddenHeader=true */}
          {workspace?.key && (
            <TestIframe
              className={cx('report-charts')}
              // src={
              //   'http://localhost:3000/inspur/workspaces/LPTEST01/report/test_manager?disabledCreate=true&displayContext=test_manager&showChartListHeader=1'
              // }
              src={`${baseUrl}/${getTenantKey()}/workspaces/${
                workspace?.key
              }/report/test_manager?disabledCreate=true&displayContext=test_manager&chartGroupId=${chartGroupId}&showChartListHeader=1`}
              width={'96%'}
              height={'100%'}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ReportDetail);
