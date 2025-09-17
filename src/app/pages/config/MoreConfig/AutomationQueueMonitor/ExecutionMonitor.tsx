import React, { useState } from 'react';
import { Table, Button, Select, message, Tag, Space, Tooltip, Tabs } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ReloadOutlined, RedoOutlined, LinkOutlined } from '@ant-design/icons';
import useI18n from '@/lib/hooks/useI18n';
import { queryExecutionRecords, queryPipeCallbackQueue, retryExecutionRecord } from '@/lib/automation/api';
import { AutomationExecutionRecord, PipeCallbackQueue } from '@/lib/automation/types';

const { Option } = Select;
const { TabPane } = Tabs;

// 执行记录Tab组件
const ExecutionRecordsTab: React.FC = () => {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 查询执行记录数据
  const { data: recordsData, isLoading, refetch } = useQuery({
    queryKey: ['executionRecords', statusFilter, pagination.current, pagination.pageSize],
    queryFn: () => queryExecutionRecords({
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

  // 重试执行记录
  const handleRetry = async (executionId: string) => {
    try {
      await retryExecutionRecord(executionId);
      message.success('重试成功');
      refetch();
    } catch (error: any) {
      message.error(`重试失败: ${error.message}`);
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'orange', text: '待执行' },
      running: { color: 'blue', text: '执行中' },
      parsing: { color: 'cyan', text: '解析中' },
      completed: { color: 'green', text: '已完成' },
      failed: { color: 'red', text: '失败' },
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 执行记录表格列定义
  const columns = [
    {
      title: '执行ID',
      dataIndex: 'executionId',
      key: 'executionId',
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
      title: 'Build ID',
      dataIndex: 'buildId',
      key: 'buildId',
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => text ? (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ) : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: '执行统计',
      key: 'stats',
      width: 120,
      render: (_, record: AutomationExecutionRecord) => (
        <div>
          <div>总数: {record.totalCount}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            成功: {record.successCount} | 失败: {record.failedCount} | 跳过: {record.skippedCount}
          </div>
        </div>
      ),
    },
    {
      title: 'Maven版本',
      dataIndex: 'mavenVersion',
      key: 'mavenVersion',
      width: 100,
    },
    {
      title: 'JDK版本',
      dataIndex: 'jdkVersion',
      key: 'jdkVersion',
      width: 100,
    },
    {
      title: '触发时间',
      dataIndex: 'triggerTime',
      key: 'triggerTime',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '完成时间',
      dataIndex: 'completeTime',
      key: 'completeTime',
      width: 160,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '触发用户',
      dataIndex: 'triggerUser',
      key: 'triggerUser',
      width: 120,
    },
    {
      title: '流水线',
      key: 'pipeline',
      width: 100,
      render: (_, record: AutomationExecutionRecord) => (
        record.pipeJumpUrl ? (
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            href={record.pipeJumpUrl}
            target="_blank"
          >
            查看
          </Button>
        ) : '-'
      ),
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
      render: (_, record: AutomationExecutionRecord) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<RedoOutlined />}
            onClick={() => handleRetry(record.objectId!)}
            disabled={record.status === 'running' || record.status === 'parsing'}
          >
            重试
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
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
            <Option value="pending">待执行</Option>
            <Option value="running">执行中</Option>
            <Option value="parsing">解析中</Option>
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
        dataSource={recordsData?.data || []}
        rowKey="objectId"
        loading={isLoading}
        scroll={{ x: 1500 }}
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
    </>
  );
};

// Pipe回调队列Tab组件
const PipeCallbackTab: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 查询Pipe回调队列数据
  const { data: callbackData, isLoading, refetch } = useQuery({
    queryKey: ['pipeCallbackQueue', statusFilter, pagination.current, pagination.pageSize],
    queryFn: () => queryPipeCallbackQueue({
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

  // Pipe回调队列表格列定义
  const callbackColumns = [
    {
      title: '队列ID',
      dataIndex: 'queueId',
      key: 'queueId',
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
      title: 'Build ID',
      dataIndex: 'buildId',
      key: 'buildId',
      width: 150,
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
      title: '处理时间',
      dataIndex: 'processedAt',
      key: 'processedAt',
      width: 160,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '回调数据',
      dataIndex: 'callbackData',
      key: 'callbackData',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.length > 50 ? text.substring(0, 50) + '...' : text}</span>
        </Tooltip>
      ),
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
  ];

  return (
    <>
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
        columns={callbackColumns}
        dataSource={callbackData?.data || []}
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
    </>
  );
};

// 主组件
const ExecutionMonitor: React.FC = () => {
  const { t } = useI18n();
  
  return (
    <div style={{ padding: 24 }}>
      <Tabs defaultActiveKey="execution">
        <TabPane tab="执行记录" key="execution">
          <ExecutionRecordsTab />
        </TabPane>
        <TabPane tab="Pipe回调队列" key="pipeCallback">
          <PipeCallbackTab />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ExecutionMonitor;