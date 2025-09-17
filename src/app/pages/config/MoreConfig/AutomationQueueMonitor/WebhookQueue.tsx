import React, { useState, useEffect } from 'react';
import { Table, Button, Select, message, Tag, Space, Tooltip, Dropdown, Menu } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReloadOutlined, RedoOutlined, DownOutlined } from '@ant-design/icons';
import useI18n from '@/lib/hooks/useI18n';
import { queryWebhookQueue, retryWebhookQueueItem } from '@/lib/automation/api';
import { AutomationWebhookQueue } from '@/lib/automation/types';

const { Option } = Select;

const WebhookQueue: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 查询Webhook队列数据
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['webhookQueue', statusFilter, pagination.current, pagination.pageSize],
    queryFn: () => queryWebhookQueue({
      status: statusFilter || undefined,
      skip: (pagination.current - 1) * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    keepPreviousData: true,
    refetchInterval: 60000, // 60秒自动刷新
    onSuccess: (result) => {
      setPagination(prev => ({
        ...prev,
        total: result.total,
      }));
    },
    onError: (error: any) => {
      message.error(`查询失败: ${error.message}`);
    },
  });

  // 重试队列项
  const handleRetry = async (queueId: string, forceReset: boolean = false) => {
    try {
      const result = await retryWebhookQueueItem({ queueId, forceReset });
      if (result.success) {
        message.success(result.message || (forceReset ? '强制重置成功' : '重试成功'));
        refetch();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error: any) {
      message.error(`操作失败: ${error.message}`);
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'orange', text: '待处理' },
      processing: { color: 'blue', text: '处理中' },
      completed: { color: 'green', text: '已完成' },
      failed: { color: 'red', text: '失败' },
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 表格列定义
  const columns = [
    {
      title: 'Webhook UUID',
      dataIndex: 'webhookUuid',
      key: 'webhookUuid',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '仓库名称',
      dataIndex: 'repositoryName',
      key: 'repositoryName',
      width: 150,
    },
    {
      title: '分支',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      key: 'retryCount',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '处理时长',
      key: 'duration',
      width: 100,
      render: (_, record: AutomationWebhookQueue) => {
        if (record.status === 'processing') {
          const startTime = new Date(record.updatedAt || record.createdAt).getTime();
          const now = Date.now();
          const duration = Math.floor((now - startTime) / 1000);
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          return (
            <span style={{ color: duration > 600 ? 'red' : 'orange' }}>
              {minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`}
            </span>
          );
        } else if (record.processedTime && record.createdAt) {
          const startTime = new Date(record.createdAt).getTime();
          const endTime = new Date(record.processedTime).getTime();
          const duration = Math.floor((endTime - startTime) / 1000);
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          return `${minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`}`;
        }
        return '-';
      },
    },
    {
      title: '处理时间',
      dataIndex: 'processedTime',
      key: 'processedTime',
      width: 160,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => text ? (
        <Tooltip title={text}>
          <span style={{ color: 'red' }}>{text}</span>
        </Tooltip>
      ) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_, record: AutomationWebhookQueue) => {
        const retryMenu = (
          <Menu
            items={[
              {
                key: 'normal',
                label: '正常重试',
                onClick: () => handleRetry(record.objectId!, false),
                disabled: record.retryCount >= 3,
              },
              {
                key: 'force',
                label: '强制重置',
                onClick: () => handleRetry(record.objectId!, true),
              },
            ]}
          />
        );

        return (
          <Space>
            {record.retryCount < 3 ? (
              <Button
                type="link"
                size="small"
                icon={<RedoOutlined />}
                onClick={() => handleRetry(record.objectId!, false)}
                disabled={record.status === 'processing'}
              >
                重试
              </Button>
            ) : (
              <Dropdown overlay={retryMenu} trigger={['click']}>
                <Button type="link" size="small" disabled={record.status === 'processing'}>
                  重试 <DownOutlined />
                </Button>
              </Dropdown>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Select
            placeholder="选择状态"
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
          >
            <Option value="">全部</Option>
            <Option value="pending">待处理</Option>
            <Option value="processing">处理中</Option>
            <Option value="completed">已完成</Option>
            <Option value="failed">失败</Option>
          </Select>
        </Space>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={() => refetch()}
          loading={isLoading}
        >
          刷新
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={queueData?.data || []}
        rowKey="objectId"
        loading={isLoading}
        scroll={{ x: 1200 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, size) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: size || 20,
            }));
          },
        }}
      />
    </div>
  );
};

export default WebhookQueue;