// 自动化执行相关的类型定义

// Webhook队列接口
export interface AutomationWebhookQueue {
  objectId?: string;
  webhookUuid: string; // Webhook唯一标识
  repositoryId: string; // 仓库ID
  repositoryName: string; // 仓库名称
  branchName: string; // 分支名称
  commitIds: string; // 提交ID列表（JSON字符串）
  workspaceKey: string; // 工作空间key
  gitCloneUrl: string; // Git克隆URL
  gitBranch: string; // Git分支
  gitPath: string; // Git路径
  status: 'pending' | 'processing' | 'completed' | 'failed'; // 处理状态
  retryCount: number; // 重试次数
  processedAt?: Date; // 处理时间
  errorMessage?: string; // 错误信息
  createdAt?: Date; // 创建时间
  updatedAt?: Date; // 更新时间
}

// 自动化执行状态枚举
export enum AutomationExecutionStatus {
  PENDING = 'pending', // 已创建，等待执行
  RUNNING = 'running', // 执行中
  PARSING = 'parsing', // 解析结果中
  COMPLETED = 'completed', // 执行完成
  FAILED = 'failed', // 执行失败
}

// 测试执行自动化状态枚举
export enum TestExecutionAutomationStatus {
  PENDING = 'pending', // 待执行
  RUNNING = 'running', // 执行中
  SUCCESS = 'success', // 成功
  FAILED = 'failed', // 失败
}

// 自动化执行记录接口
export interface AutomationExecutionRecord {
  objectId?: string;
  executionId: string; // 本次执行ID（内部生成，格式：exec_20240115_143052_8f3a）
  buildId?: string; // pipe返回的buildId（用于关联回调）
  testExecutionIds: string; // 选中的测试执行ID列表（JSON字符串）
  mavenVersion: string; // Maven版本
  jdkVersion: string; // JDK版本
  status: AutomationExecutionStatus; // 执行状态
  triggerTime: Date; // 触发时间
  completeTime?: Date; // 完成时间
  pipeJumpUrl?: string; // 流水线跳转URL
  pipeLogUrl?: string; // 流水线日志URL
  reportUrl?: string; // 测试报告URL
  reportLogUrl?: string; // 报告执行日志URL
  triggerUser: string; // 触发用户
  workspaceKey: string; // 工作空间key
  errorMessage?: string; // 错误信息
  // 执行统计
  totalCount: number; // 总执行数
  successCount: number; // 成功数
  failedCount: number; // 失败数
  skippedCount: number; // 跳过数
}

// Pipe回调队列接口
export interface PipeCallbackQueue {
  objectId?: string;
  queueId: string; // 队列记录ID
  buildId: string; // pipe的buildId
  callbackData: string; // 回调数据JSON
  status: 'pending' | 'processing' | 'completed' | 'failed'; // 处理状态
  retryCount: number; // 重试次数
  processedAt?: Date; // 处理时间
  errorMessage?: string; // 错误信息
}

// Pipe回调请求接口
export interface PipeCallbackRequest {
  buildId: string; // 执行唯一ID
  status: 'completed' | 'failed'; // 执行状态
  pipeJmpUrl: string; // 流水线构建跳转地址URL
  pipeLogFile?: string; // 流水线执行任务日志文件URL
  reportFile?: string; // 测试报告文件URL（Excel格式）
  reportLogFile?: string; // 报告执行日志URL
}

// Excel解析结果接口
export interface ExcelParseResult {
  taskId: string;
  status: string;
  result: {
    fileName: string;
    data: Array<{
      'Test ID': string;
      'Class Name': string;
      'Method Name': string;
      Result: 'SUCCESS' | 'FAILED' | 'SKIPPED';
      'Execution Time': string;
    }>;
    rowCount: number;
    columnCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

// 自定义字段常量
export const AUTOMATION_FIELD_KEYS = {
  AUTOMATION_STATUS: 'automation_status',
} as const;

// 生成执行ID的工具函数
export function generateExecutionId(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, '')
    .slice(0, 14);
  const random = Math.random().toString(36).substring(2, 8);
  return `exec_${timestamp}_${random}`;
}

// 生成队列ID的工具函数
export function generateQueueId(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.]/g, '')
    .slice(0, 14);
  const random = Math.random().toString(36).substring(2, 6);
  return `queue_${timestamp}_${random}`;
}

// 获取自动化状态显示文本
export function getAutomationStatusLabel(status: TestExecutionAutomationStatus): string {
  const statusLabels = {
    [TestExecutionAutomationStatus.PENDING]: '待执行',
    [TestExecutionAutomationStatus.RUNNING]: '执行中',
    [TestExecutionAutomationStatus.SUCCESS]: '成功',
    [TestExecutionAutomationStatus.FAILED]: '失败',
  };
  return statusLabels[status] || status;
}

// 检查是否可以执行自动化测试
export function canExecuteAutomation(status: string): boolean {
  return status !== TestExecutionAutomationStatus.RUNNING;
}

// 测试执行ID数组与JSON字符串互转的工具函数
export function serializeTestExecutionIds(ids: string[]): string {
  return JSON.stringify(ids);
}

export function deserializeTestExecutionIds(idsJson: string): string[] {
  try {
    const parsed = JSON.parse(idsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse testExecutionIds JSON:', error);
    return [];
  }
}
