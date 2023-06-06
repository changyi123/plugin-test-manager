import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import React from 'react';

import cx from './index.less';
import TestIframe from './TestIframe';

const ReportDetail: React.FC<any> = () => {
  return (
    <div className={cx('report-box')}>
      <div className={cx('report-header')}>
        <div className={cx('report-header-title')}>
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
            <div className={cx('name')}>0428迭代-测试报告</div>
            <div className={cx('status', `${'pass'}`)}>{'通过'}</div>
            <EditOutlined className={cx('editor-icon')} />
          </div>
          <div className={cx('overview')}>{/* TODO 概览信息 */}</div>
        </div>
      </div>
      <TestIframe
        src={
          'http://localhost:3000/inspur/workspaces/LP01/report/test_manager?disabledCreate=true&displayContext=test_manager'
        }
      />
    </div>
  );
};

export default React.memo(ReportDetail);
