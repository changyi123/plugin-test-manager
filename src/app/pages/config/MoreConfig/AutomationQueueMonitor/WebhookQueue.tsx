import { DownOutlined, EyeOutlined, RedoOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Descriptions,
  Dropdown,
  Menu,
  message,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import React, { useEffect, useState } from 'react';

import {
  getQueueDetails,
  queryWebhookQueue,
  QueueDetailedStats,
  retryWebhookQueueItem,
} from '@/lib/automation/api';
import { AutomationWebhookQueue } from '@/lib/automation/types';
import useI18n from '@/lib/hooks/useI18n';

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
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');

  // 查询Webhook队列数据
  const {
    data: queueData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['webhookQueue', statusFilter, pagination.current, pagination.pageSize],
    queryFn: () =>
      queryWebhookQueue({
        status: statusFilter === '' ? undefined : statusFilter,
        skip: (pagination.current - 1) * pagination.pageSize,
        limit: pagination.pageSize,
      }),
    keepPreviousData: true,
    refetchInterval: 60000, // 60秒自动刷新
  });

  // Handle data loading success
  React.useEffect(() => {
    if (queueData?.total !== undefined) {
      setPagination(prev => ({
        ...prev,
        total: queueData.total,
      }));
    }
  }, [queueData?.total]);

  // Handle errors
  React.useEffect(() => {
    if (queueData && 'success' in queueData && !queueData.success) {
      message.error(`查询失败: ${'error' in queueData ? queueData.error : '未知错误'}`);
    }
  }, [queueData]);

  // 查询队列详情
  const {
    data: queueDetails,
    isLoading: detailsLoading,
    error: detailsError,
  } = useQuery({
    queryKey: ['queueDetails', selectedQueueId],
    queryFn: () => getQueueDetails(selectedQueueId),
    enabled: !!selectedQueueId && detailsVisible,
    refetchInterval: detailsVisible ? 5000 : false, // 打开详情时5秒刷新
  });

  // Handle queue details error
  React.useEffect(() => {
    if (detailsError) {
      console.error('[WebhookQueue] 查询队列详情失败:', detailsError);
      message.error(`查询详情失败: ${(detailsError as any)?.message || '未知错误'}`);
    }
  }, [detailsError]);

  // 重试队列项
  const handleRetry = async (queueId: string, forceReset = false) => {
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

  // 打开详情弹窗
  const handleViewDetails = (queueId: string) => {
    setSelectedQueueId(queueId);
    setDetailsVisible(true);
  };

  // 获取处理步骤描述
  const getStepDescription = (step?: string) => {
    const stepMap = {
      start: '开始处理',
      analyzing_diff: '分析代码变更',
      processing_file: '处理文件',
      generating_operations: '生成操作',
      executing_operations: '执行操作',
      completed: '处理完成',
      failed: '处理失败',
    };
    return stepMap[step as keyof typeof stepMap] || step || '未知状态';
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
      title: '处理进度',
      key: 'progress',
      width: 200,
      render: (_, record: AutomationWebhookQueue) => {
        if (record.status === 'processing') {
          return (
            <div
              style={{
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.3s',
              }}
              onClick={() => handleViewDetails(record.objectId!)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ fontSize: '12px', color: '#fa8c16', fontWeight: 'bold' }}>
                🔄 处理中...
              </div>
              <div style={{ fontSize: '11px', color: '#1890ff' }}>点击查看详情</div>
            </div>
          );
        }

        if (record.status === 'completed') {
          return (
            <div
              style={{
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.3s',
              }}
              onClick={() => handleViewDetails(record.objectId!)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ color: '#52c41a', fontWeight: 'bold' }}>✅ 已完成</div>
              <div style={{ fontSize: '12px', color: '#1890ff' }}>点击查看统计</div>
            </div>
          );
        }

        if (record.status === 'failed') {
          return (
            <div
              style={{
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.3s',
              }}
              onClick={() => handleViewDetails(record.objectId!)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>❌ 处理失败</div>
              <div style={{ fontSize: '12px', color: '#1890ff' }}>点击查看详情</div>
            </div>
          );
        }

        return '-';
      },
    },
    {
      title: '用例统计',
      key: 'caseStats',
      width: 120,
      render: (_, record: AutomationWebhookQueue) => {
        if (record.status === 'completed') {
          return (
            <div
              style={{
                cursor: 'pointer',
                color: '#1890ff',
                textAlign: 'center',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.3s',
              }}
              onClick={() => handleViewDetails(record.objectId!)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>点击查看</div>
              <div style={{ fontSize: '11px', color: '#666' }}>详细统计</div>
            </div>
          );
        }

        if (record.status === 'processing') {
          return (
            <div
              style={{
                cursor: 'pointer',
                color: '#fa8c16',
                textAlign: 'center',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.3s',
              }}
              onClick={() => handleViewDetails(record.objectId!)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>查看进度</div>
            </div>
          );
        }

        if (record.status === 'failed') {
          return (
            <div
              style={{
                cursor: 'pointer',
                color: '#ff4d4f',
                textAlign: 'center',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.3s',
              }}
              onClick={() => handleViewDetails(record.objectId!)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>查看错误</div>
            </div>
          );
        }

        return '-';
      },
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
        } else if (record.processedAt && record.createdAt) {
          const startTime = new Date(record.createdAt).getTime();
          const endTime = new Date(record.processedAt).getTime();
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
      dataIndex: 'processedAt',
      key: 'processedAt',
      width: 160,
      render: (date: string) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) =>
        text ? (
          <Tooltip title={text}>
            <span style={{ color: 'red' }}>{text}</span>
          </Tooltip>
        ) : (
          '-'
        ),
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
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record.objectId!)}
            >
              详情
            </Button>
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
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
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
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>
          刷新
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={queueData?.data || []}
        rowKey="objectId"
        loading={isLoading}
        scroll={{ x: 1400 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: total => `共 ${total} 条`,
          onChange: (page, size) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: size || 20,
            }));
          },
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="队列处理详情"
        open={detailsVisible}
        onCancel={() => {
          setDetailsVisible(false);
          setSelectedQueueId('');
        }}
        footer={null}
        width={800}
      >
        {detailsLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>加载详情中...</div>
          </div>
        ) : queueDetails ? (
          <div>
            {/* 基本信息 */}
            <Descriptions title="基本信息" bordered size="small" column={2}>
              <Descriptions.Item label="仓库名称">
                {queueDetails.queueInfo?.repositoryName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="分支名称">
                {queueDetails.queueInfo?.branchName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(queueDetails.queueInfo?.status || 'unknown')}
              </Descriptions.Item>
              <Descriptions.Item label="重试次数">
                {queueDetails.queueInfo?.retryCount || 0}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {queueDetails.queueInfo?.createdAt
                  ? new Date(queueDetails.queueInfo.createdAt).toLocaleString()
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="处理时间">
                {queueDetails.queueInfo?.processedAt
                  ? new Date(queueDetails.queueInfo.processedAt).toLocaleString()
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 处理进度 */}
            {queueDetails.processingStats && (
              <div style={{ marginTop: 16 }}>
                <h4>处理进度</h4>
                <Descriptions bordered size="small" column={3}>
                  <Descriptions.Item label="当前步骤">
                    {getStepDescription(queueDetails.processingStats.currentStep)}
                  </Descriptions.Item>
                  <Descriptions.Item label="当前Commit">
                    {queueDetails.processingStats.currentCommit || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="当前文件">
                    {queueDetails.processingStats.currentFile || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="文件进度">
                    {queueDetails.processingStats.totalFiles > 0 ? (
                      <div>
                        <Progress
                          percent={Math.round(
                            (queueDetails.processingStats.processedFiles /
                              queueDetails.processingStats.totalFiles) *
                              100,
                          )}
                          size="small"
                          format={() =>
                            `${queueDetails.processingStats!.processedFiles}/${
                              queueDetails.processingStats!.totalFiles
                            }`
                          }
                        />
                      </div>
                    ) : (
                      '-'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="识别用例数">
                    <span
                      style={{
                        color: queueDetails.operationStats ? '#722ed1' : '#fa8c16',
                        fontWeight: 'bold',
                      }}
                    >
                      {queueDetails.operationStats?.uniqueTestCases ||
                        queueDetails.processingStats.identifiedCases ||
                        0}
                    </span>
                    {!queueDetails.operationStats && (
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                        (操作数)
                      </span>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="待执行操作">
                    {queueDetails.processingStats.pendingOperations || 0}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}

            {/* 操作统计详情 */}
            {(() => {
              // 计算从 caseGenerationLogs 得出的统计数据
              let calculatedStats = null;

              if (
                !queueDetails.operationStats &&
                queueDetails.caseGenerationLogs &&
                queueDetails.caseGenerationLogs.length > 0
              ) {
                const stats = {
                  createOperations: 0,
                  updateOperations: 0,
                  deleteOperations: 0,
                  totalOperations: 0,
                  uniqueFiles: new Set(),
                };

                queueDetails.caseGenerationLogs.forEach(log => {
                  try {
                    const operationTypes = JSON.parse(log.operationTypes || '[]');
                    operationTypes.forEach(type => {
                      const upperType = type.toUpperCase();
                      if (upperType === 'CREATE') stats.createOperations += log.operationsGenerated;
                      else if (upperType === 'UPDATE')
                        stats.updateOperations += log.operationsGenerated;
                      else if (upperType === 'DELETE')
                        stats.deleteOperations += log.operationsGenerated;
                    });
                    stats.totalOperations += log.operationsGenerated;
                    stats.uniqueFiles.add(log.fileName);
                  } catch (error) {
                    console.error('[操作统计] 解析操作类型失败:', error);
                  }
                });

                calculatedStats = {
                  createOperations: stats.createOperations,
                  updateOperations: stats.updateOperations,
                  deleteOperations: stats.deleteOperations,
                  totalOperations: stats.totalOperations,
                  uniqueTestCases: stats.uniqueFiles.size,
                };
              }

              const statsToShow = queueDetails.operationStats || calculatedStats;

              return statsToShow ? (
                <div style={{ marginTop: 16 }}>
                  <h4>操作统计{!queueDetails.operationStats && ' (从日志计算)'}</h4>
                  <Descriptions bordered size="small" column={3}>
                    <Descriptions.Item label="创建操作">
                      <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                        {statsToShow.createOperations || 0}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="更新操作">
                      <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                        {statsToShow.updateOperations || 0}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="删除操作">
                      <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                        {statsToShow.deleteOperations || 0}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="总操作数">
                      <span style={{ fontWeight: 'bold' }}>{statsToShow.totalOperations || 0}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="涉及文件数">
                      <span style={{ color: '#722ed1', fontWeight: 'bold' }}>
                        {statsToShow.uniqueTestCases || 0}
                      </span>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              ) : null;
            })()}

            {/* 执行统计 */}
            {queueDetails.processingStats &&
              queueDetails.queueInfo?.status === 'completed' &&
              (() => {
                // 获取操作统计（用于显示执行结果的分类）
                const statsToShow =
                  queueDetails.operationStats ||
                  (() => {
                    if (
                      queueDetails.caseGenerationLogs &&
                      queueDetails.caseGenerationLogs.length > 0
                    ) {
                      const stats = {
                        createOperations: 0,
                        updateOperations: 0,
                        deleteOperations: 0,
                      };
                      queueDetails.caseGenerationLogs.forEach(log => {
                        const operationTypes = JSON.parse(log.operationTypes || '[]');
                        operationTypes.forEach(type => {
                          const upperType = type.toUpperCase();
                          if (upperType === 'CREATE')
                            stats.createOperations += log.operationsGenerated;
                          else if (upperType === 'UPDATE')
                            stats.updateOperations += log.operationsGenerated;
                          else if (upperType === 'DELETE')
                            stats.deleteOperations += log.operationsGenerated;
                        });
                      });
                      return stats;
                    }
                    return null;
                  })();

                return (
                  <div style={{ marginTop: 16 }}>
                    <h4>执行结果</h4>
                    <Descriptions bordered size="small" column={3}>
                      {statsToShow && (
                        <>
                          <Descriptions.Item label="创建成功">
                            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                              {statsToShow.createOperations || 0}
                            </span>
                          </Descriptions.Item>
                          <Descriptions.Item label="更新成功">
                            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                              {statsToShow.updateOperations || 0}
                            </span>
                          </Descriptions.Item>
                          <Descriptions.Item label="删除成功">
                            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                              {statsToShow.deleteOperations || 0}
                            </span>
                          </Descriptions.Item>
                        </>
                      )}
                      <Descriptions.Item label="总成功数">
                        <span style={{ color: '#52c41a' }}>
                          {queueDetails.processingStats.successfulCases || 0}
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="失败数量">
                        <span style={{ color: '#ff4d4f' }}>
                          {queueDetails.processingStats.failedCases || 0}
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="跳过数量">
                        {queueDetails.processingStats.skippedCases || 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="成功率">
                        {queueDetails.processingStats.completedOperations > 0
                          ? `${Math.round(
                              (queueDetails.processingStats.successfulCases /
                                queueDetails.processingStats.completedOperations) *
                                100,
                            )}%`
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="最后更新">
                        {queueDetails.processingStats.lastUpdateTime
                          ? new Date(queueDetails.processingStats.lastUpdateTime).toLocaleString()
                          : '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                );
              })()}

            {/* 错误信息 */}
            {queueDetails.queueInfo?.errorMessage && (
              <div style={{ marginTop: 16 }}>
                <h4>错误信息</h4>
                <div
                  style={{
                    background: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: 4,
                    padding: 12,
                    color: '#ff4d4f',
                  }}
                >
                  {queueDetails.queueInfo?.errorMessage}
                </div>
              </div>
            )}

            {/* 文件处理概览 */}
            {queueDetails.summary && (
              <div style={{ marginTop: 16 }}>
                <h4>处理概览</h4>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {queueDetails.fileProcessingLogs?.length ||
                        queueDetails.summary.totalFiles ||
                        0}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>处理文件数</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: queueDetails.operationStats ? '#722ed1' : '#fa8c16',
                      }}
                    >
                      {queueDetails.operationStats?.uniqueTestCases ||
                        queueDetails.summary.identifiedCases}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {queueDetails.operationStats ? '涉及文件数' : '总操作数'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#13c2c2' }}>
                      {queueDetails.summary.successfulCases}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>执行成功数</div>
                  </div>
                  {queueDetails.summary.failedCases > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                        {queueDetails.summary.failedCases}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>执行失败数</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 文件处理详情表格 */}
            {queueDetails.fileProcessingLogs && queueDetails.fileProcessingLogs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>文件处理详情</h4>
                <Table
                  size="small"
                  columns={[
                    {
                      title: '文件名',
                      dataIndex: 'fileName',
                      key: 'fileName',
                      width: 200,
                      render: (text: string) => (
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>
                      ),
                    },
                    {
                      title: '用例数',
                      key: 'operationsGenerated',
                      width: 80,
                      align: 'center' as const,
                      render: (_: any, record: any) => {
                        // 从caseGenerationLogs中查找对应的操作数
                        const genLog = queueDetails.caseGenerationLogs?.find(
                          (log: any) => log.fileName === record.fileName
                        );
                        if (genLog && genLog.operationsGenerated > 0) {
                          return (
                            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                              {genLog.operationsGenerated}
                            </span>
                          );
                        }
                        return <span style={{ color: '#999' }}>-</span>;
                      },
                    },
                    {
                      title: '状态',
                      key: 'status',
                      width: 80,
                      align: 'center' as const,
                      render: (_: any, record: any) => {
                        if (record.errorMessage) {
                          return <Tag color="warning">跳过</Tag>;
                        } else if (record.shouldProcess) {
                          return <Tag color="success">成功</Tag>;
                        } else {
                          return <Tag color="default">忽略</Tag>;
                        }
                      },
                    },
                    {
                      title: '处理时间',
                      dataIndex: 'processingTime',
                      key: 'processingTime',
                      width: 100,
                      align: 'center' as const,
                      render: (time: number) => `${time}ms`,
                    },
                    {
                      title: '备注',
                      dataIndex: 'errorMessage',
                      key: 'errorMessage',
                      render: (text: string) => text || '-',
                    },
                  ]}
                  dataSource={queueDetails.fileProcessingLogs}
                  rowKey={(record: any) => record.fileName + record.timestamp}
                  pagination={false}
                  scroll={{ y: 300 }}
                />
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <div>暂无数据</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WebhookQueue;
