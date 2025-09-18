import { useQuery } from '@tanstack/react-query';
import { Card, Col, message, Row, Statistic, Tabs } from 'antd';
import React, { useState } from 'react';

import { getQueueStats } from '@/lib/automation/api';
import useI18n from '@/lib/hooks/useI18n';

import ExecutionMonitor from './ExecutionMonitor';
import cx from './index.less';
import WebhookQueue from './WebhookQueue';

const { TabPane } = Tabs;

const AutomationQueueMonitor: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('webhook');

  // 查询队列统计信息
  const { data: stats } = useQuery({
    queryKey: ['queueStats'],
    queryFn: getQueueStats,
    refetchInterval: 30000, // 30秒自动刷新
    onError: (error: any) => {
      console.error('获取队列统计失败:', error);
    },
  });

  return (
    <div className={cx('automation-queue-monitor')}>
      {/* 统计卡片 */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Webhook队列"
                value={stats?.webhook?.total || 0}
                suffix={
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div>待处理: {stats?.webhook?.pending || 0}</div>
                    <div>处理中: {stats?.webhook?.processing || 0}</div>
                    <div>失败: {stats?.webhook?.failed || 0}</div>
                  </div>
                }
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="执行记录"
                value={stats?.execution?.total || 0}
                suffix={
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div>待执行: {stats?.execution?.pending || 0}</div>
                    <div>执行中: {stats?.execution?.running || 0}</div>
                    <div>失败: {stats?.execution?.failed || 0}</div>
                  </div>
                }
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Pipe回调队列"
                value={stats?.pipeCallback?.total || 0}
                suffix={
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div>待处理: {stats?.pipeCallback?.pending || 0}</div>
                    <div>处理中: {stats?.pipeCallback?.processing || 0}</div>
                    <div>失败: {stats?.pipeCallback?.failed || 0}</div>
                  </div>
                }
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 队列监控Tab */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={t('automationQueueMonitor.tab.webhook')} key="webhook">
          <WebhookQueue />
        </TabPane>
        <TabPane tab={t('automationQueueMonitor.tab.execution')} key="execution">
          <ExecutionMonitor />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AutomationQueueMonitor;
