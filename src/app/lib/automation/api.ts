// import { storage } from '@giteeteam/apps-api';

import fetch from '@/lib/utils/fetch';
import { getTenantKey, isDev } from '@/lib/utils/helper';

import {
  AUTOMATION_FIELD_KEYS,
  AutomationExecutionRecord,
  AutomationExecutionStatus,
  AutomationWebhookQueue,
  generateExecutionId,
  PipeCallbackQueue,
  serializeTestExecutionIds,
  TestExecutionAutomationStatus,
} from './types';

// 执行参数接口
interface TriggerExecutionParams {
  testExecutionIds: string[];
  mavenVersion: string;
  jdkVersion: string;
}

// 触发执行响应接口
interface TriggerExecutionResponse {
  executionId: string;
  buildId: string;
  pipeJumpUrl: string;
}

// 检查执行状态响应接口
interface ExecutionStatusCheck {
  canExecute: boolean;
  runningExecutions: string[];
  totalCount: number;
}

// 队列查询参数接口
interface QueueQueryParams {
  limit?: number;
  skip?: number;
  status?: string;
  workspaceKey?: string;
}

// 分页响应接口
interface PaginationResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  limit: number;
  skip: number;
}

/**
 * 检查测试执行的自动化执行状态（已简化，仅保留兼容性）
 * 注意：T3统一接口已包含状态检查，前端无需单独调用此函数
 */
export async function checkExecutionStatus(
  testExecutionIds: string[],
): Promise<ExecutionStatusCheck> {
  console.log('[Automation] checkExecutionStatus 已被T3统一接口替代，跳过前端检查');

  // 简化版本：假设可以执行，实际检查由后端统一接口完成
  return {
    canExecute: true,
    runningExecutions: [],
    totalCount: testExecutionIds.length,
  };
}

/**
 * 更新测试执行的自动化状态
 */
export async function updateTestExecutionStatus(
  testExecutionIds: string[],
  status: TestExecutionAutomationStatus,
): Promise<void> {
  try {
    const updatePromises = testExecutionIds.map(execId =>
      fetch.$put(`/parse/api/classes/TestExecution/${execId}`, {
        customFields: {
          [AUTOMATION_FIELD_KEYS.AUTOMATION_STATUS]: status,
        },
      }),
    );

    await Promise.all(updatePromises);
    console.log(
      `[Automation] 批量更新执行状态成功: ${testExecutionIds.length} 个用例状态更新为 ${status}`,
    );
  } catch (error) {
    console.error('[Automation] 更新执行状态失败:', error);
    throw new Error('更新执行状态失败');
  }
}

/**
 * 创建自动化执行记录
 */
export async function createExecutionRecord(
  executionId: string,
  params: TriggerExecutionParams,
  buildId?: string,
  pipeJumpUrl?: string,
): Promise<AutomationExecutionRecord> {
  try {
    const record: Omit<AutomationExecutionRecord, 'objectId'> = {
      executionId,
      buildId: buildId || '',
      testExecutionIds: serializeTestExecutionIds(params.testExecutionIds),
      mavenVersion: params.mavenVersion,
      jdkVersion: params.jdkVersion,
      status: AutomationExecutionStatus.PENDING,
      triggerTime: new Date(),
      pipeJumpUrl: pipeJumpUrl || '',
      triggerUser: 'current_user', // TODO: 获取当前用户
      workspaceKey: 'current_workspace', // TODO: 获取当前工作空间
      totalCount: params.testExecutionIds.length,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    // const response = await storage.entity('AutomationExecutionRecord').add(record);
    // console.log(`[Automation] 创建执行记录成功: ${executionId}`);

    return {
      ...record,
      // objectId: response.id,
      objectId: null,
    };
  } catch (error) {
    console.error('[Automation] 创建执行记录失败:', error);
    throw new Error('创建执行记录失败');
  }
}

/**
 * 调用 Pipe 流水线触发接口
 */
async function callPipeWebHook(params: TriggerExecutionParams): Promise<{
  buildId: string;
  pipeJumpUrl: string;
}> {
  try {
    // 构建 Pipe 请求参数
    const pipeParams = {
      mavenVersion: params.mavenVersion,
      jdkVersion: params.jdkVersion,
      testExecutionIds: params.testExecutionIds,
      // TODO: 添加其他必要参数，如回调地址等
    };

    // 调用 Pipe WebHook 接口
    // 注意：这里需要根据实际的 Pipe 接口文档来调整请求格式
    const response = await fetch.$post('/api/ipipe/pipeline/rest/v1/openApi/webHook', pipeParams);

    if (!response?.buildId) {
      throw new Error('Pipe 接口返回格式错误，缺少 buildId');
    }

    return {
      buildId: response.buildId,
      pipeJumpUrl: response.pipeJumpUrl || '',
    };
  } catch (error) {
    console.error('[Automation] 调用 Pipe 接口失败:', error);
    throw new Error('调用流水线接口失败: ' + error.message);
  }
}

/**
 * 触发自动化执行（T3统一接口版本）
 * 简化版本：只需调用后端统一接口
 */
export async function triggerAutomationExecution(
  params: TriggerExecutionParams,
): Promise<TriggerExecutionResponse> {
  console.log(
    `[Automation] 调用统一后端接口触发自动化执行: ${params.testExecutionIds.length} 个用例`,
  );

  try {
    const tenant = getTenantKey();
    // 获取当前环境，优先从context中获取，如果没有则根据NODE_ENV判断，默认为development
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    console.log('[Automation] 当前环境:', environment);
    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-automation-execute`;

    const requestData = {
      testExecutionIds: params.testExecutionIds,
      mavenVersion: params.mavenVersion,
      jdkVersion: params.jdkVersion,
    };

    console.log('[Automation] API请求参数:', requestData);
    console.log('[Automation] API请求路径:', apiPath);

    const result = await fetch.$post(apiPath, requestData);

    if (result.success) {
      // 处理嵌套的data结构：result.data.data.executionId
      const responseData = result.data.data || result.data;
      console.log(`[Automation] 自动化执行触发成功: ${responseData.executionId}`);
      return {
        executionId: responseData.executionId,
        buildId: responseData.buildId || '',
        pipeJumpUrl: responseData.pipeJumpUrl || '',
      };
    } else {
      console.error('[Automation] 后端接口返回失败:', result.error);
      throw new Error(result.error.message || '自动化执行失败');
    }
  } catch (error) {
    console.error('[Automation] 触发自动化执行失败:', error);

    // 如果是网络错误或其他非业务错误，抛出通用错误
    if (error.response || error.request) {
      throw new Error('网络请求失败，请稍后重试');
    }

    throw error;
  }
}

/**
 * 根据 buildId 查询执行记录
 */
export async function getExecutionRecordByBuildId(
  buildId: string,
): Promise<AutomationExecutionRecord | null> {
  try {
    // const record = await storage
    //   .entity('AutomationExecutionRecord')
    //   .query()
    //   .equalTo('buildId', buildId)
    //   .first();

    return null;
  } catch (error) {
    console.error('[Automation] 查询执行记录失败:', error);
    return null;
  }
}

/**
 * 更新执行记录状态
 */
export async function updateExecutionRecord(
  recordId: string,
  updates: Partial<AutomationExecutionRecord>,
): Promise<void> {
  try {
    // await storage.entity('AutomationExecutionRecord').set(recordId, updates);
    console.log(`[Automation] 更新执行记录成功: ${recordId}`);
  } catch (error) {
    console.error('[Automation] 更新执行记录失败:', error);
    throw error;
  }
}

// ======================== 队列监控相关API ========================

/**
 * 查询Webhook队列列表
 */
export async function queryWebhookQueue(
  params: QueueQueryParams = {},
): Promise<PaginationResponse<AutomationWebhookQueue>> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-webhook-list`;

    const result = await fetch.$post(apiPath, params);

    if (result.success && result.data?.data?.list) {
      // 解析实际API返回的嵌套数据结构
      return {
        success: true,
        data: result.data.data.list.data || [],
        total: result.data.data.list.total || 0,
        limit: result.data.data.list.limit || 20,
        skip: result.data.data.list.skip || 0,
      };
    } else {
      throw new Error(result.error?.message || '查询Webhook队列失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 查询Webhook队列失败:', error);
    throw error;
  }
}

/**
 * 查询执行记录列表
 */
export async function queryExecutionRecords(
  params: QueueQueryParams = {},
): Promise<PaginationResponse<AutomationExecutionRecord>> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-execution-list`;

    const result = await fetch.$post(apiPath, params);

    if (result.success && result.data?.data?.list) {
      // 解析实际API返回的嵌套数据结构
      return {
        success: true,
        data: result.data.data.list.data || [],
        total: result.data.data.list.total || 0,
        limit: result.data.data.list.limit || 20,
        skip: result.data.data.list.skip || 0,
      };
    } else {
      throw new Error(result.error?.message || '查询执行记录失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 查询执行记录失败:', error);
    throw error;
  }
}

/**
 * 查询Pipe回调队列列表
 */
export async function queryPipeCallbackQueue(
  params: QueueQueryParams = {},
): Promise<PaginationResponse<PipeCallbackQueue>> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-callback-list`;

    const result = await fetch.$post(apiPath, params);

    if (result.success && result.data?.data?.list) {
      // 解析实际API返回的嵌套数据结构
      return {
        success: true,
        data: result.data.data.list.data || [],
        total: result.data.data.list.total || 0,
        limit: result.data.data.list.limit || 20,
        skip: result.data.data.list.skip || 0,
      };
    } else {
      throw new Error(result.error?.message || '查询Pipe回调队列失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 查询Pipe回调队列失败:', error);
    throw error;
  }
}

/**
 * 重试Webhook队列项
 */
export async function retryWebhookQueueItem(params: {
  queueId: string;
  forceReset?: boolean;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-webhook-retry`;

    const result = await fetch.$post(apiPath, params);

    if (result.success) {
      return result;
    } else {
      throw new Error(result.error?.message || '重试Webhook队列项失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 重试Webhook队列项失败:', error);
    throw error;
  }
}

/**
 * 手动标记Pipe回调队列项为失败
 */
export async function markPipeCallbackFailed(
  queueId: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-callback-mark-failed`;

    const result = await fetch.$post(apiPath, { queueId });

    if (result.success) {
      return result;
    } else {
      throw new Error(result.error?.message || '标记Pipe回调队列项失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 标记Pipe回调队列项失败:', error);
    throw error;
  }
}

/**
 * 重试执行记录
 */
export async function retryExecutionRecord(
  executionId: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-execution-retry`;

    const result = await fetch.$post(apiPath, { executionId });

    if (result.success) {
      return result;
    } else {
      throw new Error(result.error?.message || '重试执行记录失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 重试执行记录失败:', error);
    throw error;
  }
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats(): Promise<{
  webhook: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  };
  execution: { pending: number; running: number; completed: number; failed: number; total: number };
  pipeCallback: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  };
}> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-stats`;

    const result = await fetch.$post(apiPath, {});

    if (result.success) {
      // 解析嵌套的数据结构
      if (result.data?.data?.data) {
        return result.data.data.data;
      }
      return result.data;
    } else {
      throw new Error(result.error?.message || '获取队列统计失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 获取队列统计失败:', error);
    throw error;
  }
}

// ======================== 新增统计详情API ========================

/**
 * 队列详细统计信息接口
 */
export interface QueueDetailedStats {
  queueInfo: AutomationWebhookQueue;
  processingStats?: {
    totalFiles: number;
    processedFiles: number;
    identifiedCases: number;
    pendingOperations: number;
    completedOperations: number;
    successfulCases: number;
    failedCases: number;
    skippedCases: number;
    currentCommit?: string;
    currentFile?: string;
    currentStep?: string;
    lastUpdateTime?: Date;
  };
  operationStats?: {
    createOperations: number;
    updateOperations: number;
    deleteOperations: number;
    queryOperations: number;
    totalOperations: number;
    uniqueTestCases: number;
    timestamp?: Date;
  };
  fileProcessingLogs: Array<{
    commitId: string;
    fileName: string;
    shouldProcess: boolean;
    operationsGenerated?: number;
    processingTime?: number;
    timestamp: Date;
    errorMessage?: string;
  }>;
  caseGenerationLogs: Array<{
    fileName: string;
    operationsGenerated: number;
    operationTypes: string;
    timestamp: Date;
  }>;
  // 新增字段：同步日志
  syncLogs?: Array<{
    testId: string;
    caseId?: string;
    operationType: string;
    syncStatus: string;
    success?: boolean;
    details?: string;
    errorDetails?: string;
    createdCases?: number;
    updatedCases?: number;
    failedCases?: number;
    timestamp: string;
  }>;
  // 新增字段：错误信息汇总
  errorSummary?: {
    totalErrors: number;
    errors: Array<{
      testId: string;
      operationType: string;
      error: string;
      timestamp: string;
    }>;
  };
  summary: {
    totalFiles: number;
    processedFiles: number;
    shouldProcessFiles: number;
    identifiedCases: number;
    successfulCases: number;
    failedCases: number;
    createdCases?: number;
    updatedCases?: number;
    deletedCases?: number;
  };
}

/**
 * 查询队列详细统计信息
 */
export async function getQueueDetails(queueId: string): Promise<QueueDetailedStats> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-details`;

    const result = await fetch.$post(apiPath, { queueId });

    if (result.success && result.data?.data) {
      // 解析实际API返回的嵌套数据结构
      return result.data.data.data || result.data.data;
    } else {
      throw new Error(result.error?.message || '查询队列详情失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 查询队列详情失败:', error);
    throw error;
  }
}

/**
 * 查询文件处理统计
 */
export async function getFileProcessingStats(queueId: string): Promise<{
  files: Array<{
    fileName: string;
    shouldProcess: boolean;
    operationsGenerated: number;
    processingTime: number;
    status: 'success' | 'failed' | 'skipped';
    errorMessage?: string;
  }>;
}> {
  try {
    const tenant = getTenantKey();
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';

    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }

    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-queue-file-stats`;

    const result = await fetch.$post(apiPath, { queueId });

    if (result.success) {
      return result.data?.data || result.data;
    } else {
      throw new Error(result.error?.message || '查询文件处理统计失败');
    }
  } catch (error) {
    console.error('[QueueMonitor] 查询文件处理统计失败:', error);
    throw error;
  }
}
