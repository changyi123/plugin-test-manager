/**
 * @file 队列统计功能
 * 在现有解析流程中插入统计逻辑，实现增量统计和实时监控
 */
import { storage } from '@giteeteam/apps-api';

import { CaseFailureLog, OperationStatistics, ProcessStep } from './types';

/**
 * 更新当前文件处理进度
 */
export async function updateCurrentFileProgress(
  queueId: string,
  fileName: string,
  processedCount: number,
  totalFiles?: number,
) {
  try {
    // 先查询是否已存在统计记录
    const existingStats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', queueId)
      .first();

    const updateData: any = {
      queueId,
      processedFiles: processedCount,
      currentFile: fileName,
      currentStep: ProcessStep.PROCESSING_FILE,
      lastUpdateTime: new Date(),
    };

    if (totalFiles !== undefined) {
      updateData.totalFiles = totalFiles;
    }

    if (existingStats) {
      // 更新现有记录
      await storage.entity('QueueProcessingStatistics').set(existingStats.objectId, updateData);
    } else {
      // 创建新记录
      await storage.entity('QueueProcessingStatistics').add(updateData);
    }

    console.log(
      `[Statistics] 更新文件进度: ${processedCount}/${totalFiles || '?'}, 当前文件: ${fileName}`,
    );
  } catch (error) {
    console.error('[Statistics] 更新文件进度失败:', error);
  }
}

/**
 * 记录文件处理日志
 */
export async function logFileProcessing(
  queueId: string,
  commitId: string,
  fileName: string,
  shouldProcess: boolean,
  processingTime: number,
  errorMessage?: string,
) {
  try {
    await storage.entity('FileProcessingLog').add({
      queueId,
      commitId,
      fileName,
      shouldProcess,
      processingTime,
      timestamp: new Date(),
      errorMessage: errorMessage || null,
    });

    console.log(
      `[Statistics] 记录文件处理: ${fileName}, 应处理: ${shouldProcess}, 耗时: ${processingTime}ms`,
    );
  } catch (error) {
    console.error('[Statistics] 记录文件处理日志失败:', error);
  }
}

/**
 * 更新用例生成进度
 */
export async function updateCaseGenerationProgress(
  queueId: string,
  fileName: string,
  operations: any[],
) {
  try {
    const operationsCount = operations.length;

    if (operationsCount === 0) {
      return; // 没有生成操作，不需要更新
    }

    const operationTypes = [...new Set(operations.map(op => op.operationType))];

    // 获取或创建统计记录
    const stats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', queueId)
      .first();

    if (stats) {
      // 累加已识别的用例数
      await storage.entity('QueueProcessingStatistics').set(stats.objectId, {
        identifiedCases: (stats.identifiedCases || 0) + operationsCount,
        pendingOperations: (stats.pendingOperations || 0) + operationsCount,
        currentStep: ProcessStep.GENERATING_OPERATIONS,
        lastUpdateTime: new Date(),
      });
    } else {
      // 创建新的统计记录
      await storage.entity('QueueProcessingStatistics').add({
        queueId,
        identifiedCases: operationsCount,
        pendingOperations: operationsCount,
        currentStep: ProcessStep.GENERATING_OPERATIONS,
        lastUpdateTime: new Date(),
      });
    }

    // 记录用例生成日志
    await storage.entity('CaseGenerationLog').add({
      queueId,
      fileName,
      operationsGenerated: operationsCount,
      operationTypes: JSON.stringify(operationTypes),
      timestamp: new Date(),
    });

    console.log(`[Statistics] 更新用例生成: ${fileName} 生成 ${operationsCount} 个操作`);
  } catch (error) {
    console.error('[Statistics] 更新用例生成进度失败:', error);
  }
}

/**
 * 更新执行结果统计
 */
export async function updateExecutionProgress(queueId: string, results: any) {
  try {
    const stats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', queueId)
      .first();

    const updateData = {
      currentStep: ProcessStep.COMPLETED,
      completedOperations: results.total,
      successfulCases: results.successful,
      failedCases: results.failed,
      skippedCases: results.skipped || 0,
      lastUpdateTime: new Date(),
    };

    if (stats) {
      await storage.entity('QueueProcessingStatistics').set(stats.objectId, updateData);
    } else {
      await storage.entity('QueueProcessingStatistics').add({
        queueId,
        ...updateData,
      });
    }

    console.log(
      `[Statistics] 更新执行结果: 总数${results.total}, 成功${results.successful}, 失败${results.failed}`,
    );
  } catch (error) {
    console.error('[Statistics] 更新执行进度失败:', error);
  }
}

/**
 * 更新队列开始处理状态
 */
export async function updateQueueStartProcessing(queueId: string, totalCommits: number) {
  try {
    // 先删除旧的统计记录（如果存在）
    const existingStats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', queueId)
      .first();

    if (existingStats) {
      await storage.entity('QueueProcessingStatistics').delete(existingStats.objectId);
    }

    // 创建新的统计记录
    await storage.entity('QueueProcessingStatistics').add({
      queueId,
      currentStep: ProcessStep.START,
      totalFiles: 0,
      processedFiles: 0,
      identifiedCases: 0,
      pendingOperations: 0,
      completedOperations: 0,
      successfulCases: 0,
      failedCases: 0,
      skippedCases: 0,
      lastUpdateTime: new Date(),
    });

    console.log(`[Statistics] 开始处理队列: ${totalCommits} 个commits`);
  } catch (error) {
    console.error('[Statistics] 更新队列开始状态失败:', error);
  }
}

/**
 * 更新当前处理的commit
 */
export async function updateCurrentCommit(queueId: string, commitId: string, filesCount: number) {
  try {
    const stats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', queueId)
      .first();

    const updateData = {
      currentCommit: commitId.substring(0, 8),
      currentStep: ProcessStep.ANALYZING_DIFF,
      totalFiles: (stats?.totalFiles || 0) + filesCount,
      lastUpdateTime: new Date(),
    };

    if (stats) {
      await storage.entity('QueueProcessingStatistics').set(stats.objectId, updateData);
    } else {
      await storage.entity('QueueProcessingStatistics').add({
        queueId,
        ...updateData,
      });
    }

    console.log(
      `[Statistics] 更新当前commit: ${commitId.substring(0, 8)}, 新增 ${filesCount} 个文件`,
    );
  } catch (error) {
    console.error('[Statistics] 更新当前commit失败:', error);
  }
}

/**
 * 标记处理失败
 */
export async function markProcessingFailed(queueId: string, errorMessage: string) {
  try {
    const stats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', queueId)
      .first();

    const updateData = {
      currentStep: ProcessStep.FAILED,
      lastUpdateTime: new Date(),
    };

    if (stats) {
      await storage.entity('QueueProcessingStatistics').set(stats.objectId, updateData);
    } else {
      await storage.entity('QueueProcessingStatistics').add({
        queueId,
        ...updateData,
      });
    }

    // 同时更新主表的错误信息
    await storage.entity('AutomationWebhookQueue').set(queueId, {
      errorMessage,
    });

    console.log(`[Statistics] 标记处理失败: ${errorMessage}`);
  } catch (error) {
    console.error('[Statistics] 标记处理失败状态失败:', error);
  }
}

/**
 * 开始执行操作阶段
 */
export async function updateExecutionStart(queueId: string, operationsCount: number) {
  try {
    const stats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', queueId)
      .first();

    const updateData = {
      currentStep: ProcessStep.EXECUTING_OPERATIONS,
      pendingOperations: operationsCount,
      lastUpdateTime: new Date(),
    };

    if (stats) {
      await storage.entity('QueueProcessingStatistics').set(stats.objectId, updateData);
    } else {
      await storage.entity('QueueProcessingStatistics').add({
        queueId,
        ...updateData,
      });
    }

    console.log(`[Statistics] 开始执行阶段: ${operationsCount} 个操作`);
  } catch (error) {
    console.error('[Statistics] 更新执行开始状态失败:', error);
  }
}

/**
 * 清理旧的日志记录（保留最近7天）
 */
export async function cleanupOldLogs() {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 清理文件处理日志
    const oldFileProcessingLogs = await storage
      .entity('FileProcessingLog')
      .query()
      .lessThan('timestamp', weekAgo)
      .limit(100)
      .find();

    if (oldFileProcessingLogs.length > 0) {
      const deletePromises = oldFileProcessingLogs.map(log =>
        storage.entity('FileProcessingLog').delete(log.objectId),
      );
      await Promise.all(deletePromises);
      console.log(`[Statistics] 清理了 ${oldFileProcessingLogs.length} 条文件处理日志`);
    }

    // 清理用例生成日志
    const oldCaseGenerationLogs = await storage
      .entity('CaseGenerationLog')
      .query()
      .lessThan('timestamp', weekAgo)
      .limit(100)
      .find();

    if (oldCaseGenerationLogs.length > 0) {
      const deletePromises = oldCaseGenerationLogs.map(log =>
        storage.entity('CaseGenerationLog').delete(log.objectId),
      );
      await Promise.all(deletePromises);
      console.log(`[Statistics] 清理了 ${oldCaseGenerationLogs.length} 条用例生成日志`);
    }
    // 清理失败日志
    const oldFailureLogs = await storage
      .entity('CaseFailureLog')
      .query()
      .lessThan('failureTime', weekAgo)
      .limit(100)
      .find();

    if (oldFailureLogs.length > 0) {
      const deletePromises = oldFailureLogs.map(log =>
        storage.entity('CaseFailureLog').delete(log.objectId),
      );
      await Promise.all(deletePromises);
      console.log(`[Statistics] 清理了 ${oldFailureLogs.length} 条失败日志`);
    }
  } catch (error) {
    console.error('[Statistics] 清理旧日志失败:', error);
  }
}

/**
 * 记录用例失败详情
 */
export async function logCaseFailure(failureData: Omit<CaseFailureLog, 'objectId'>) {
  try {
    await storage.entity('CaseFailureLog').add(failureData);
    console.log(`[Statistics] 记录失败用例: ${failureData.caseName || failureData.caseId}`);
  } catch (error) {
    console.error('[Statistics] 记录失败用例失败:', error);
  }
}

/**
 * 记录操作统计（新版本 - 按操作类型分开统计）
 */
export async function recordOperationStatistics(
  queueId: string,
  operations: any[],
  uniqueTestCases: Set<string>,
) {
  try {
    if (operations.length === 0) {
      return;
    }

    // 按操作类型统计
    const operationCounts = {
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      QUERY: 0,
    };

    operations.forEach(op => {
      const type = op.operationType?.toUpperCase();
      if (operationCounts.hasOwnProperty(type)) {
        operationCounts[type as keyof typeof operationCounts]++;
      }
    });

    // 获取或创建操作统计记录
    const existingStats = await storage
      .entity('OperationStatistics')
      .query()
      .equalTo('queueId', queueId)
      .first();

    const statsData: Omit<OperationStatistics, 'objectId'> = {
      queueId,
      createOperations: (existingStats?.createOperations || 0) + operationCounts.CREATE,
      updateOperations: (existingStats?.updateOperations || 0) + operationCounts.UPDATE,
      deleteOperations: (existingStats?.deleteOperations || 0) + operationCounts.DELETE,
      queryOperations: (existingStats?.queryOperations || 0) + operationCounts.QUERY,
      totalOperations: (existingStats?.totalOperations || 0) + operations.length,
      uniqueTestCases: uniqueTestCases.size, // 用最新的去重数量
      timestamp: new Date(),
    };

    if (existingStats) {
      await storage.entity('OperationStatistics').set(existingStats.objectId, statsData);
    } else {
      await storage.entity('OperationStatistics').add(statsData);
    }

    console.log(
      `[Statistics] 记录操作统计: CREATE=${operationCounts.CREATE}, UPDATE=${operationCounts.UPDATE}, DELETE=${operationCounts.DELETE}, QUERY=${operationCounts.QUERY}, 用例数=${uniqueTestCases.size}`,
    );
  } catch (error) {
    console.error('[Statistics] 记录操作统计失败:', error);
  }
}

/**
 * 目录初始化专用：更新批量文件获取进度（复用现有表）
 */
export async function updateBatchFileProgress(
  requestId: string,
  batchNumber: number,
  fileIndex: number,
  totalFiles: number,
  fileName: string,
  status: 'fetching' | 'success' | 'failed',
  errorMessage?: string,
) {
  try {
    // 复用现有的 QueueProcessingStatistics 表，用 requestId 作为 queueId
    const existingStats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', requestId)
      .first();

    const updateData: any = {
      queueId: requestId,
      currentFile: `${fileName} (${fileIndex}/${totalFiles})`,
      processedFiles: status === 'success' ? fileIndex : (fileIndex - 1),
      totalFiles,
      currentStep: status === 'failed' ? ProcessStep.FAILED : ProcessStep.PROCESSING_FILE,
      lastUpdateTime: new Date(),
    };

    if (errorMessage) {
      // 将错误信息记录到 FileProcessingLog 表（现有表）
      await storage.entity('FileProcessingLog').add({
        queueId: requestId,
        commitId: 'directory_init',
        fileName,
        shouldProcess: true,
        processingTime: 0,
        timestamp: new Date(),
        errorMessage,
      });
    }

    if (existingStats) {
      await storage.entity('QueueProcessingStatistics').set(existingStats.objectId, updateData);
    } else {
      await storage.entity('QueueProcessingStatistics').add(updateData);
    }

    console.log(
      `[Statistics] 目录初始化进度: ${fileIndex}/${totalFiles}, 批次${batchNumber}, ${fileName}, 状态: ${status}`,
    );
  } catch (error) {
    console.error('[Statistics] 更新批量文件进度失败:', error);
  }
}

/**
 * 目录初始化专用：记录文件内容获取失败（复用现有表）
 */
export async function logFileContentFetchFailure(
  requestId: string,
  filePath: string,
  errorMessage: string,
  statusCode?: number,
) {
  try {
    // 复用现有的 FileProcessingLog 表
    await storage.entity('FileProcessingLog').add({
      queueId: requestId,
      commitId: 'directory_init',
      fileName: filePath,
      shouldProcess: true,
      processingTime: 0,
      timestamp: new Date(),
      errorMessage: `HTTP ${statusCode}: ${errorMessage}`,
    });

    console.log(`[Statistics] 记录文件获取失败: ${filePath} - ${errorMessage}`);
  } catch (error) {
    console.error('[Statistics] 记录文件获取失败日志失败:', error);
  }
}

/**
 * 目录初始化专用：更新解析阶段进度（复用现有表）
 */
export async function updateParsingProgress(
  requestId: string,
  parsedCount: number,
  totalFiles: number,
  successCount: number,
  skipCount: number,
  errorCount: number,
  currentStatus?: string,
) {
  try {
    // 复用现有的 QueueProcessingStatistics 表
    const existingStats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', requestId)
      .first();

    const updateData = {
      currentStep: ProcessStep.GENERATING_OPERATIONS,
      processedFiles: parsedCount,
      totalFiles,
      identifiedCases: successCount,
      failedCases: errorCount,
      skippedCases: skipCount,
      currentFile: currentStatus || `解析中... ${parsedCount}/${totalFiles}`,
      lastUpdateTime: new Date(),
    };

    if (existingStats) {
      await storage.entity('QueueProcessingStatistics').set(existingStats.objectId, updateData);
    } else {
      await storage.entity('QueueProcessingStatistics').add({
        queueId: requestId,
        ...updateData,
      });
    }

    console.log(
      `[Statistics] 解析进度: ${parsedCount}/${totalFiles}, 成功${successCount}, 跳过${skipCount}, 失败${errorCount}`,
    );
  } catch (error) {
    console.error('[Statistics] 更新解析进度失败:', error);
  }
}

/**
 * 目录初始化专用：标记完成（复用现有表）
 */
export async function markDirectoryInitComplete(
  requestId: string,
  result: {
    totalFiles: number;
    processedFiles: number;
    createdCases: number;
    errors: any[];
    duration: number;
  },
) {
  try {
    // 复用现有的 QueueProcessingStatistics 表
    const existingStats = await storage
      .entity('QueueProcessingStatistics')
      .query()
      .equalTo('queueId', requestId)
      .first();

    const updateData = {
      currentStep: ProcessStep.COMPLETED,
      totalFiles: result.totalFiles,
      processedFiles: result.processedFiles,
      identifiedCases: result.createdCases,
      successfulCases: result.createdCases,
      failedCases: result.errors.length,
      completedOperations: result.processedFiles,
      currentFile: '处理完成',
      lastUpdateTime: new Date(),
    };

    if (existingStats) {
      await storage.entity('QueueProcessingStatistics').set(existingStats.objectId, updateData);
    } else {
      await storage.entity('QueueProcessingStatistics').add({
        queueId: requestId,
        ...updateData,
      });
    }

    console.log(
      `[Statistics] 目录初始化完成: 处理${result.processedFiles}/${result.totalFiles}文件, 创建${result.createdCases}用例, 耗时${result.duration}ms`,
    );
  } catch (error) {
    console.error('[Statistics] 标记目录初始化完成失败:', error);
  }
}
