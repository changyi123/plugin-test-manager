/**
 * @file 队列监控API
 */
import { storage } from '@giteeteam/apps-api';

import { buildPaginationResponse, buildResponse } from '../../lib/apiUtil';
import { AutomationWebhookQueue, AutomationExecutionRecord, PipeCallbackQueue } from '../automation/types';

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
    
    const result = await query
      .descending('createdAt')
      .skip(skip)
      .limit(limit)
      .find();

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
      data: result,
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
    
    const result = await query
      .descending('triggerTime')
      .skip(skip)
      .limit(limit)
      .find();

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
    
    const result = await query
      .descending('createdAt')
      .skip(skip)
      .limit(limit)
      .find();

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
export async function retryWebhookQueueItem(params: { queueId: string; forceReset?: boolean }) {
  try {
    const { queueId, forceReset = false } = params;
    
    // 查询当前队列项
    const queueItem = await storage.entity('AutomationWebhookQueue').get(queueId);
    if (!queueItem) {
      return buildResponse({
        success: false,
        error: '队列项不存在',
      });
    }

    console.log(`[QueueMonitor] 重试队列项: ${queueId}, 当前状态: ${queueItem.status}, 强制重置: ${forceReset}`);

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
    const record = await storage.entity('AutomationExecutionRecord').get(executionId);
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
        total: pipeCallbackPending + pipeCallbackProcessing + pipeCallbackCompleted + pipeCallbackFailed,
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