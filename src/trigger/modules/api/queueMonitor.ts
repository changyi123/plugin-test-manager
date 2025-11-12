/**
 * @file 队列监控API
 */
import { storage } from '@giteeteam/apps-api';

import { buildPaginationResponse, buildResponse } from '../../lib/apiUtil';
import {
  AutomationExecutionRecord,
  AutomationWebhookQueue,
  PipeCallbackQueue,
} from '../automation/types';

// 查询参数接口
export interface QueueQueryParams {
  limit?: number;
  skip?: number;
  status?: string;
  workspaceKey?: string;
}

/**
 * 查询Webhook队列列表
 */
export async function queryWebhookQueue(params: QueueQueryParams = {}) {
  try {
    const { limit = 20, skip = 0, status, workspaceKey } = params;

    // 构建查询条件
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (workspaceKey) {
      where.workspaceKey = workspaceKey;
    }

    // 查询数据
    let query = storage.entity('AutomationWebhookQueue').query();

    // 添加查询条件
    if (where.status) {
      query = query.equalTo('status', where.status);
    }
    if (where.workspaceKey) {
      query = query.equalTo('workspaceKey', where.workspaceKey);
    }

    const result = await query.descending('createdAt').skip(skip).limit(limit).find();

    // 为completed状态的队列添加统计数据
    const enhancedResult = await Promise.all(
      result.map(async (queue) => {
        if (queue.status === 'completed') {
          try {
            // 从 QueueProcessingStatistics 表查询准确的统计数据
            const processingStats = await storage
              .entity('QueueProcessingStatistics')
              .query()
              .equalTo('queueId', queue.objectId)
              .first();

            if (processingStats) {
              const successfulCases = processingStats.successfulCases || 0;
              const failedCases = processingStats.failedCases || 0;

              // 添加统计数据到队列对象
              return {
                ...queue,
                stats: {
                  successfulCases,
                  failedCases,
                  totalCases: successfulCases + failedCases
                }
              };
            }

            // 如果没有找到统计数据，返回原队列数据
            return queue;
          } catch (error) {
            console.error('[QueueMonitor] 获取队列统计失败:', queue.objectId, error);
            // 如果获取统计失败，返回原队列数据
            return queue;
          }
        }

        // 非completed状态，直接返回原数据
        return queue;
      })
    );

    // 查询总数
    let countQuery = storage.entity('AutomationWebhookQueue').query();
    if (where.status) {
      countQuery = countQuery.equalTo('status', where.status);
    }
    if (where.workspaceKey) {
      countQuery = countQuery.equalTo('workspaceKey', where.workspaceKey);
    }
    const total = await countQuery.count();

    return buildPaginationResponse({
      data: enhancedResult,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('[QueueMonitor] 查询Webhook队列失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 查询执行记录列表
 */
export async function queryExecutionRecords(params: QueueQueryParams = {}) {
  try {
    const { limit = 20, skip = 0, status, workspaceKey } = params;

    // 构建查询条件
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (workspaceKey) {
      where.workspaceKey = workspaceKey;
    }

    // 查询数据
    let query = storage.entity('AutomationExecutionRecord').query();

    // 添加查询条件
    if (where.status) {
      query = query.equalTo('status', where.status);
    }
    if (where.workspaceKey) {
      query = query.equalTo('workspaceKey', where.workspaceKey);
    }

    const result = await query.descending('triggerTime').skip(skip).limit(limit).find();

    // 查询总数
    let countQuery = storage.entity('AutomationExecutionRecord').query();
    if (where.status) {
      countQuery = countQuery.equalTo('status', where.status);
    }
    if (where.workspaceKey) {
      countQuery = countQuery.equalTo('workspaceKey', where.workspaceKey);
    }
    const total = await countQuery.count();

    return buildPaginationResponse({
      data: result,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('[QueueMonitor] 查询执行记录失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 手动标记Pipe回调队列项为失败
 */
export async function markPipeCallbackFailed(requestParams: any) {
  try {
    // 从requestParams.payload中获取参数
    const { queueId } = requestParams.payload || requestParams;

    if (!queueId) {
      return buildResponse({
        success: false,
        error: '队列ID不能为空',
      });
    }

    // 更新队列项状态为failed
    await storage.entity('PipeCallbackQueue').set(queueId, {
      status: 'failed',
      errorMessage: '手动标记为失败（用于处理卡住的任务）',
      processedAt: new Date(),
    });

    console.log(`[QueueMonitor] 成功将Pipe回调队列项标记为失败: ${queueId}`);

    return buildResponse({
      success: true,
      message: '成功标记为失败',
    });
  } catch (error) {
    console.error('[QueueMonitor] 标记Pipe回调队列项失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 查询Pipe回调队列列表
 */
export async function queryPipeCallbackQueue(params: QueueQueryParams = {}) {
  try {
    const { limit = 20, skip = 0, status } = params;

    // 构建查询条件
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // 查询数据
    let query = storage.entity('PipeCallbackQueue').query();

    // 添加查询条件
    if (where.status) {
      query = query.equalTo('status', where.status);
    }

    const result = await query.descending('createdAt').skip(skip).limit(limit).find();

    // 查询总数
    let countQuery = storage.entity('PipeCallbackQueue').query();
    if (where.status) {
      countQuery = countQuery.equalTo('status', where.status);
    }
    const total = await countQuery.count();

    return buildPaginationResponse({
      data: result,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('[QueueMonitor] 查询Pipe回调队列失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 重试Webhook队列项
 */
export async function retryWebhookQueueItem(requestParams: any) {
  try {
    // 从requestParams.payload中获取参数
    const { queueId, forceReset = false } = requestParams.payload || requestParams;

    // 查询当前队列项
    const queueItem = await storage
      .entity('AutomationWebhookQueue')
      .query()
      .equalTo('objectId', queueId)
      .first();
    if (!queueItem) {
      return buildResponse({
        success: false,
        error: '队列项不存在',
      });
    }

    console.log(
      `[QueueMonitor] 重试队列项: ${queueId}, 当前状态: ${queueItem.status}, 强制重置: ${forceReset}`,
    );

    let updateData: any;

    if (forceReset) {
      // 强制重置：清零重试次数，重置为pending状态
      updateData = {
        status: 'pending',
        retryCount: 0,
        errorMessage: '手动强制重置',
        processedAt: null,
        processedTime: null,
        updatedAt: new Date(),
      };
      console.log(`[QueueMonitor] 强制重置队列项: ${queueId}`);
    } else {
      // 正常重试：增加重试次数
      const newRetryCount = (queueItem.retryCount || 0) + 1;

      if (newRetryCount >= 3) {
        return buildResponse({
          success: false,
          error: '已达最大重试次数，请使用强制重置',
        });
      }

      updateData = {
        status: 'pending',
        retryCount: newRetryCount,
        errorMessage: `手动重试第${newRetryCount}次`,
        processedAt: null,
        processedTime: null,
        updatedAt: new Date(),
      };
      console.log(`[QueueMonitor] 正常重试队列项: ${queueId}, 重试次数: ${newRetryCount}`);
    }

    await storage.entity('AutomationWebhookQueue').set(queueId, updateData);

    return buildResponse({
      success: true,
      message: forceReset ? '强制重置成功' : '重试成功',
    });
  } catch (error) {
    console.error('[QueueMonitor] 重试Webhook队列项失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 重试执行记录
 */
export async function retryExecutionRecord(params: { executionId: string }) {
  try {
    const { executionId } = params;

    // 查询当前执行记录
    const record = await storage
      .entity('AutomationExecutionRecord')
      .query()
      .equalTo('objectId', executionId)
      .first();
    if (!record) {
      return buildResponse({
        success: false,
        error: '执行记录不存在',
      });
    }

    // 更新状态为pending，清除错误信息
    const updateData = {
      status: 'pending',
      errorMessage: null,
      completeTime: null,
    };

    await storage.entity('AutomationExecutionRecord').set(executionId, updateData);

    return buildResponse({
      success: true,
      message: '重试成功',
    });
  } catch (error) {
    console.error('[QueueMonitor] 重试执行记录失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats() {
  try {
    // 并行查询各种状态的数量
    const [
      webhookPending,
      webhookProcessing,
      webhookCompleted,
      webhookFailed,
      executionPending,
      executionRunning,
      executionCompleted,
      executionFailed,
      pipeCallbackPending,
      pipeCallbackProcessing,
      pipeCallbackCompleted,
      pipeCallbackFailed,
    ] = await Promise.all([
      // Webhook队列统计
      storage.entity('AutomationWebhookQueue').query().equalTo('status', 'pending').count(),
      storage.entity('AutomationWebhookQueue').query().equalTo('status', 'processing').count(),
      storage.entity('AutomationWebhookQueue').query().equalTo('status', 'completed').count(),
      storage.entity('AutomationWebhookQueue').query().equalTo('status', 'failed').count(),
      // 执行记录统计
      storage.entity('AutomationExecutionRecord').query().equalTo('status', 'pending').count(),
      storage.entity('AutomationExecutionRecord').query().equalTo('status', 'running').count(),
      storage.entity('AutomationExecutionRecord').query().equalTo('status', 'completed').count(),
      storage.entity('AutomationExecutionRecord').query().equalTo('status', 'failed').count(),
      // Pipe回调队列统计
      storage.entity('PipeCallbackQueue').query().equalTo('status', 'pending').count(),
      storage.entity('PipeCallbackQueue').query().equalTo('status', 'processing').count(),
      storage.entity('PipeCallbackQueue').query().equalTo('status', 'completed').count(),
      storage.entity('PipeCallbackQueue').query().equalTo('status', 'failed').count(),
    ]);

    const stats = {
      webhook: {
        pending: webhookPending,
        processing: webhookProcessing,
        completed: webhookCompleted,
        failed: webhookFailed,
        total: webhookPending + webhookProcessing + webhookCompleted + webhookFailed,
      },
      execution: {
        pending: executionPending,
        running: executionRunning,
        completed: executionCompleted,
        failed: executionFailed,
        total: executionPending + executionRunning + executionCompleted + executionFailed,
      },
      pipeCallback: {
        pending: pipeCallbackPending,
        processing: pipeCallbackProcessing,
        completed: pipeCallbackCompleted,
        failed: pipeCallbackFailed,
        total:
          pipeCallbackPending + pipeCallbackProcessing + pipeCallbackCompleted + pipeCallbackFailed,
      },
    };

    return buildResponse({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[QueueMonitor] 获取队列统计失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 获取队列详细统计信息
 */
export async function getQueueDetails(params: any) {
  try {
    console.log('[QueueMonitor] getQueueDetails 收到原始params:', JSON.stringify(params, null, 2));

    // 尝试从不同层级获取queueId
    let queueId = params.queueId;
    if (!queueId && params.payload) {
      queueId = params.payload.queueId;
    }
    if (!queueId && typeof params.payload === 'string') {
      try {
        const parsed = JSON.parse(params.payload);
        queueId = parsed.queueId;
      } catch (e) {
        console.error('[QueueMonitor] 解析payload失败:', e);
      }
    }

    console.log('[QueueMonitor] getQueueDetails 开始，queueId:', queueId);

    // 1. 查询队列基本信息
    const queueInfo = await storage
      .entity('AutomationWebhookQueue')
      .query()
      .equalTo('objectId', queueId)
      .first();
    if (!queueInfo) {
      return buildResponse({
        success: false,
        error: '队列记录不存在',
      });
    }

    // 尝试查询统计表，如果失败则使用默认值
    let processingStats = null;
    let fileProcessingLogs = [];
    let caseGenerationLogs = [];

    // 2. 尝试查询处理统计信息
    try {
      processingStats = await storage
        .entity('QueueProcessingStatistics')
        .query()
        .equalTo('queueId', queueId)
        .first();
    } catch (error) {
      console.error('[QueueMonitor] QueueProcessingStatistics 查询失败:', error);
      // 继续执行，使用 null 作为默认值
    }

    // 2.5. 查询操作统计信息
    let operationStats = null;
    try {
      operationStats = await storage
        .entity('OperationStatistics')
        .query()
        .equalTo('queueId', queueId)
        .first();
    } catch (error) {
      console.error('[QueueMonitor] OperationStatistics 查询失败:', error);
    }

    // 3. 尝试查询文件处理日志
    try {
      fileProcessingLogs =
        (await storage
          .entity('FileProcessingLog')
          .query()
          .equalTo('queueId', queueId)
          .ascending('timestamp')
          .find()) || [];
    } catch (error) {
      console.error('[QueueMonitor] FileProcessingLog 查询失败:', error);
      fileProcessingLogs = [];
    }

    // 4. 尝试查询用例生成日志
    try {
      caseGenerationLogs =
        (await storage
          .entity('CaseGenerationLog')
          .query()
          .equalTo('queueId', queueId)
          .ascending('timestamp')
          .find()) || [];
    } catch (error) {
      console.error('[QueueMonitor] CaseGenerationLog 查询失败:', error);
      caseGenerationLogs = [];
    }

    // 5. 查询AutomationSyncLog 获取详细的同步结果和错误信息（只查询失败的）
    let syncLogs = [];
    try {
      syncLogs =
        (await storage
          .entity('AutomationSyncLog')
          .query()
          .equalTo('webhookQueueId', queueId)
          .equalTo('syncStatus', 'failed')  // 只查询失败的日志
          .descending('createdAt')
          .limit(10000)  // 设置一个足够大的 limit
          .find()) || [];
    } catch (error) {
      console.error('[QueueMonitor] AutomationSyncLog 查询失败:', error);
      syncLogs = [];
    }

    // 6. 从AutomationSyncLog计算失败统计（只记录了失败的）
    const syncStats = {
      totalFailed: 0,
      errorDetails: []
    };

    if (Array.isArray(syncLogs)) {
      syncStats.totalFailed = syncLogs.length;
      syncLogs.forEach(log => {
        // 收集错误详情
        if (log.errorDetails || log.error) {
          syncStats.errorDetails.push({
            testId: log.testId,
            operationType: log.operationType,
            error: log.errorDetails || log.error,
            timestamp: log.createdAt
          });
        }
      });
    }

    // 6. 计算汇总统计
    const summary = {
      totalFiles: Array.isArray(fileProcessingLogs) ? fileProcessingLogs.length : 0,
      processedFiles: Array.isArray(fileProcessingLogs) ? fileProcessingLogs.length : 0,
      shouldProcessFiles: Array.isArray(fileProcessingLogs)
        ? fileProcessingLogs.filter(log => log.shouldProcess).length
        : 0,
      // 使用新的操作统计数据，如果没有则回退到旧的方式
      totalOperations:
        operationStats?.totalOperations ||
        (Array.isArray(caseGenerationLogs)
          ? caseGenerationLogs.reduce((sum, log) => sum + (log.operationsGenerated || 0), 0)
          : 0),
      identifiedTestCases: operationStats?.uniqueTestCases || 0,
      // 兼容旧字段
      identifiedCases:
        operationStats?.uniqueTestCases ||
        (Array.isArray(caseGenerationLogs)
          ? caseGenerationLogs.reduce((sum, log) => sum + (log.operationsGenerated || 0), 0)
          : 0),
      // 优先使用 QueueProcessingStatistics 的统计数据（更准确）
      successfulCases: processingStats?.successfulCases || 0,
      failedCases: processingStats?.failedCases || 0,
      // 添加详细的操作统计（从 OperationStatistics 获取）
      createdCases: operationStats?.createOperations || 0,
      updatedCases: operationStats?.updateOperations || 0,
      deletedCases: operationStats?.deleteOperations || 0,
    };

    const result = {
      queueInfo,
      processingStats: processingStats
        ? {
            totalFiles: processingStats.totalFiles || 0,
            processedFiles: processingStats.processedFiles || 0,
            identifiedCases: processingStats.identifiedCases || 0,
            pendingOperations: processingStats.pendingOperations || 0,
            completedOperations: processingStats.completedOperations || 0,
            successfulCases: processingStats.successfulCases || 0,
            failedCases: processingStats.failedCases || 0,
            currentCommit: processingStats.currentCommit,
            currentFile: processingStats.currentFile,
            currentStep: processingStats.currentStep,
            lastUpdateTime: processingStats.lastUpdateTime,
            // 分类成功数
            createSuccessful: processingStats.createSuccessful || 0,
            updateSuccessful: processingStats.updateSuccessful || 0,
            deleteSuccessful: processingStats.deleteSuccessful || 0,
            // 操作合并信息（从JSON字符串解析）
            operationMergeInfo: processingStats.operationMergeInfo
              ? JSON.parse(processingStats.operationMergeInfo)
              : undefined,
          }
        : null,
      operationStats: operationStats
        ? {
            createOperations: operationStats.createOperations || 0,
            updateOperations: operationStats.updateOperations || 0,
            deleteOperations: operationStats.deleteOperations || 0,
            queryOperations: operationStats.queryOperations || 0,
            totalOperations: operationStats.totalOperations || 0,
            uniqueTestCases: operationStats.uniqueTestCases || 0,
            timestamp: operationStats.timestamp,
          }
        : null,
      fileProcessingLogs: Array.isArray(fileProcessingLogs)
        ? fileProcessingLogs.map(log => ({
            commitId: log.commitId,
            fileName: log.fileName,
            shouldProcess: log.shouldProcess,
            operationsGenerated: log.operationsGenerated,
            processingTime: log.processingTime,
            timestamp: log.timestamp,
            errorMessage: log.errorMessage,
          }))
        : [],
      caseGenerationLogs: Array.isArray(caseGenerationLogs)
        ? caseGenerationLogs.map(log => ({
            fileName: log.fileName,
            operationsGenerated: log.operationsGenerated,
            operationTypes: log.operationTypes,
            timestamp: log.timestamp,
          }))
        : [],
      // 添加AutomationSyncLog信息（只有失败的）
      syncLogs: Array.isArray(syncLogs)
        ? syncLogs.map(log => ({
            testId: log.testId,
            caseId: log.caseId,
            operationType: log.operationType,
            syncStatus: 'failed',
            success: false,
            details: log.details,
            errorDetails: log.errorDetails || log.error,
            timestamp: log.createdAt,
          }))
        : [],
      // 添加错误信息汇总
      errorSummary: {
        totalErrors: syncStats.errorDetails.length,
        errors: syncStats.errorDetails,
      },
      summary,
    };

    return buildResponse({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[QueueMonitor] 获取队列详情失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 手动重置Pipe回调队列项为待处理状态
 */
export async function resetPipeCallbackToPending(requestParams: any) {
  try {
    // 从requestParams.payload中获取参数
    const { queueId } = requestParams.payload || requestParams;

    if (!queueId) {
      return buildResponse({
        success: false,
        error: '队列ID不能为空',
      });
    }

    // 导入重置函数
    const { resetPipeCallbackToPending: resetCallback } = await import('../automation/database');
    
    // 重置队列项状态为pending
    await resetCallback(queueId);

    console.log(`[QueueMonitor] 成功将Pipe回调队列项重置为待处理: ${queueId}`);

    return buildResponse({
      success: true,
      message: '成功重置为待处理状态',
    });
  } catch (error) {
    console.error('[QueueMonitor] 重置Pipe回调队列项失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 获取文件处理统计
 */
export async function getQueueFileStats(params: any) {
  try {
    // 尝试从不同层级获取queueId
    let queueId = params.queueId;
    if (!queueId && params.payload) {
      queueId = params.payload.queueId;
    }
    if (!queueId && typeof params.payload === 'string') {
      try {
        const parsed = JSON.parse(params.payload);
        queueId = parsed.queueId;
      } catch (e) {
        console.error('[QueueMonitor] getQueueFileStats 解析payload失败:', e);
      }
    }

    // 查询文件处理日志
    const fileProcessingLogs = await storage
      .entity('FileProcessingLog')
      .query()
      .equalTo('queueId', queueId)
      .ascending('timestamp')
      .find();

    // 查询用例生成日志，用于匹配操作数量
    const caseGenerationLogs = await storage
      .entity('CaseGenerationLog')
      .query()
      .equalTo('queueId', queueId)
      .ascending('timestamp')
      .find();

    // 建立文件名到用例生成数量的映射
    const caseGenerationMap = new Map();
    (caseGenerationLogs || []).forEach(log => {
      caseGenerationMap.set(log.fileName, log.operationsGenerated || 0);
    });

    // 构建文件统计
    const files = (fileProcessingLogs || []).map(log => {
      const operationsGenerated = caseGenerationMap.get(log.fileName) || 0;

      let status: 'success' | 'failed' | 'skipped' = 'skipped';
      if (log.shouldProcess) {
        status = log.errorMessage ? 'failed' : 'success';
      }

      return {
        fileName: log.fileName,
        shouldProcess: log.shouldProcess,
        operationsGenerated,
        processingTime: log.processingTime || 0,
        status,
        errorMessage: log.errorMessage,
      };
    });

    return buildResponse({
      success: true,
      data: { files },
    });
  } catch (error) {
    console.error('[QueueMonitor] 获取文件处理统计失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
}
