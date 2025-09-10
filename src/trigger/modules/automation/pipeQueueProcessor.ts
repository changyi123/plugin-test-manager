import { storage } from '@giteeteam/apps-api';
import { axios } from '@giteeteam/apps-team-api';

import {
  getPendingPipeCallbacks,
  updatePipeCallbackStatus,
  incrementPipeCallbackRetryCount,
  markPipeCallbackFailed,
  getTestCaseMappingByBuildId,
  updateExecutionRecord,
} from './database';
import { batchUpdateItemsV2 } from '../../lib/coreApi';

// Excel解析服务配置
function getExcelParseConfig() {
  const globalData = global as any;
  return {
    baseUrl: globalData.env?.EXCEL_PARSE_BASE_URL || 'http://gitee-proxima-word-export:3001',
  };
}

// Excel解析任务状态
interface ExcelParseTask {
  taskId: string;
  status: 'accepted' | 'processing' | 'completed' | 'failed';
  message?: string;
  result?: {
    fileName: string;
    data: Array<{
      'Test ID': string;
      'Class Name': string;
      'Method Name': string;
      Result: 'SUCCESS' | 'FAILED';
      'Execution Time': string;
    }>;
    rowCount: number;
    columnCount: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Pipe回调数据接口
interface PipeCallbackData {
  buildId: string;
  status: 'completed' | 'failed';
  pipeJmpUrl?: string;
  pipeLogFile?: string;
  reportFile?: string;
  reportLogFile?: string;
  startTime?: string;
  endTime?: string;
  logFile?: string;
  jumpUrl?: string;
}

/**
 * 提交Excel解析任务
 */
async function submitExcelParseTask(
  excelUrl: string,
): Promise<{ taskId: string; status: string }> {
  const config = getExcelParseConfig();

  console.log(`[PipeQueueProcessor] 提交Excel解析任务, URL: ${excelUrl}`);

  try {
    const response = await axios({
      method: 'POST',
      url: `${config.baseUrl}/api/excel/parse`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        url: excelUrl,
      },
    });

    console.log('[PipeQueueProcessor] Excel解析任务响应:', response);

    // 检查响应数据 - 封装的axios响应数据直接在response级别
    if (!response.taskId) {
      console.error('[PipeQueueProcessor] 响应数据缺少taskId:', response);
      throw new Error('Excel解析服务响应格式错误，缺少taskId');
    }

    console.log(`[PipeQueueProcessor] Excel解析任务提交成功: taskId=${response.taskId}`);

    return {
      taskId: response.taskId,
      status: response.status || 'accepted',
    };
  } catch (error) {
    console.error('[PipeQueueProcessor] 提交Excel解析任务失败:', error);
    console.error('[PipeQueueProcessor] 错误详情:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      } : '无响应数据',
    });
    throw new Error(`提交Excel解析任务失败: ${error.message}`);
  }
}

/**
 * 查询Excel解析任务状态
 */
async function getExcelParseTaskStatus(taskId: string): Promise<ExcelParseTask> {
  const config = getExcelParseConfig();

  console.log(`[PipeQueueProcessor] 查询Excel解析任务状态, taskId: ${taskId}`);

  try {
    const response = await axios({
      method: 'GET',
      url: `${config.baseUrl}/api/excel/parse/${taskId}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[PipeQueueProcessor] Excel解析任务状态响应:', response);

    return response;
  } catch (error) {
    console.error('[PipeQueueProcessor] 查询Excel解析任务状态失败:', error);
    throw new Error(`查询Excel解析任务状态失败: ${error.message}`);
  }
}

/**
 * 根据TestID查找对应的测试执行ID
 */
async function findTestExecutionByTestId(testId: string, buildId: string): Promise<string | null> {
  console.log(`[PipeQueueProcessor] 查找TestID对应的执行ID: ${testId}, buildId: ${buildId}`);

  try {
    // 获取该buildId对应的测试用例映射关系
    const testCaseMapping = await getTestCaseMappingByBuildId(buildId);

    if (!testCaseMapping) {
      console.log(`[PipeQueueProcessor] 未找到buildId ${buildId} 对应的映射关系`);
      return null;
    }

    console.log(
      `[PipeQueueProcessor] 获取到映射关系, 共 ${Object.keys(testCaseMapping).length} 个条目`,
    );

    // 首先尝试通过TestID直接匹配
    if (testCaseMapping[testId]) {
      const executionData = testCaseMapping[testId];
      console.log(
        `[PipeQueueProcessor] 通过TestID找到匹配: ${testId} -> ${executionData.testExecutionId}`,
      );
      return executionData.testExecutionId;
    }

    // 如果TestID直接匹配失败，尝试通过className#methodName匹配
    // 从TestID中提取className和methodName信息
    const parts = testId.split('#');
    if (parts.length >= 2) {
      const className = parts[0];
      const methodName = parts[1];
      const classMethodKey = `${className}#${methodName}`;

      if (testCaseMapping[classMethodKey]) {
        const executionData = testCaseMapping[classMethodKey];
        console.log(
          `[PipeQueueProcessor] 通过className#methodName找到匹配: ${classMethodKey} -> ${executionData.testExecutionId}`,
        );
        return executionData.testExecutionId;
      }
    }

    console.log(`[PipeQueueProcessor] 未找到TestID ${testId} 对应的执行ID`);
    return null;
  } catch (error) {
    console.error('[PipeQueueProcessor] 查找TestID对应执行ID失败:', error);
    return null;
  }
}

/**
 * 更新测试执行状态
 */
async function updateTestExecutionStatus(
  testExecutionId: string,
  result: 'SUCCESS' | 'FAILED',
): Promise<void> {
  console.log(`[PipeQueueProcessor] 更新测试执行状态: ${testExecutionId} -> ${result}`);

  try {
    // 将结果映射到测试管理系统的状态值
    const testManagerStatus = result === 'SUCCESS' ? 'PASSED' : 'FAILED';

    // 使用批量更新API更新测试执行状态
    const updateParams = {
      fields: {
        values: {
          r_test_manager_status: testManagerStatus,
        },
      },
      items: [testExecutionId],
      asynchronous: false,
    };

    console.log(`[PipeQueueProcessor] 准备更新测试执行状态: ${testExecutionId} -> ${testManagerStatus}`);
    
    const updateResult = await batchUpdateItemsV2(updateParams);
    
    console.log(`[PipeQueueProcessor] 测试执行状态更新成功: ${testExecutionId} -> ${testManagerStatus}`);
    console.log(`[PipeQueueProcessor] 更新结果:`, updateResult);
  } catch (error) {
    console.error(`[PipeQueueProcessor] 更新测试执行状态失败: ${testExecutionId}`, error);
    throw error;
  }
}

/**
 * 处理Excel解析结果
 */
async function processExcelParseResult(
  parseResult: ExcelParseTask['result'],
  buildId: string,
): Promise<void> {
  if (!parseResult || !parseResult.data || !Array.isArray(parseResult.data)) {
    console.log('[PipeQueueProcessor] Excel解析结果为空或格式不正确');
    return;
  }

  console.log(
    `[PipeQueueProcessor] 开始处理Excel解析结果, 共 ${parseResult.data.length} 条测试记录`,
  );

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  // 逐条处理测试结果
  for (const testRecord of parseResult.data) {
    const testId = testRecord['Test ID'];
    const result = testRecord.Result;
    const executionTime = testRecord['Execution Time'];

    console.log(
      `[PipeQueueProcessor] 处理测试记录: TestID=${testId}, Result=${result}, Time=${executionTime}`,
    );

    if (!testId || !result) {
      console.log(`[PipeQueueProcessor] 测试记录数据不完整，跳过: ${JSON.stringify(testRecord)}`);
      skippedCount++;
      continue;
    }

    try {
      // 查找对应的测试执行ID
      const testExecutionId = await findTestExecutionByTestId(testId, buildId);

      if (!testExecutionId) {
        console.log(`[PipeQueueProcessor] 未找到TestID ${testId} 对应的测试执行，跳过更新`);
        skippedCount++;
        continue;
      }

      // 更新测试执行状态
      await updateTestExecutionStatus(testExecutionId, result);

      if (result === 'SUCCESS') {
        successCount++;
      } else {
        failedCount++;
      }

      console.log(
        `[PipeQueueProcessor] 测试记录处理成功: ${testId} -> ${testExecutionId} -> ${result}`,
      );
    } catch (error) {
      console.error(`[PipeQueueProcessor] 处理测试记录失败: ${testId}`, error);
      failedCount++;
    }
  }

  console.log(
    `[PipeQueueProcessor] Excel解析结果处理完成: 成功=${successCount}, 失败=${failedCount}, 跳过=${skippedCount}`,
  );

  // 更新AutomationExecutionRecord的统计信息
  try {
    await updateExecutionRecord(buildId, {
      status: failedCount > 0 ? 'completed_with_failures' : 'completed',
      completeTime: new Date(),
      successCount,
      failedCount,
      skippedCount,
    });

    console.log(`[PipeQueueProcessor] 更新执行记录统计信息成功: buildId=${buildId}`);
  } catch (error) {
    console.error(`[PipeQueueProcessor] 更新执行记录统计信息失败: buildId=${buildId}`, error);
  }
}

/**
 * 处理单个Pipe回调
 */
async function processPipeCallback(queueItem: any): Promise<void> {
  const queueId = queueItem.objectId;
  const buildId = queueItem.buildId;

  console.log(`[PipeQueueProcessor] === 开始处理Pipe回调 ===`);
  console.log(`[PipeQueueProcessor] queueId: ${queueId}, buildId: ${buildId}`);

  try {
    // 解析回调数据
    let callbackData: PipeCallbackData;
    try {
      callbackData = JSON.parse(queueItem.callbackData);
      console.log('[PipeQueueProcessor] 解析回调数据成功:', JSON.stringify(callbackData, null, 2));
    } catch (error) {
      console.error('[PipeQueueProcessor] 解析回调数据失败:', error);
      throw new Error('回调数据格式错误');
    }

    // 检查是否有报告文件需要解析
    if (!callbackData.reportFile) {
      console.log('[PipeQueueProcessor] 回调数据中没有报告文件，标记为完成');
      await updatePipeCallbackStatus(queueId, 'completed', new Date());
      return;
    }

    console.log(`[PipeQueueProcessor] 准备解析报告文件: ${callbackData.reportFile}`);

    // 提交Excel解析任务
    const parseTask = await submitExcelParseTask(callbackData.reportFile);
    console.log(`[PipeQueueProcessor] Excel解析任务已提交: taskId=${parseTask.taskId}`);

    // 将队列状态更新为processing，并保存taskId
    await storage.entity('PipeCallbackQueue').set(queueId, {
      status: 'processing',
      excelParseTaskId: parseTask.taskId,
      excelParseUrl: callbackData.reportFile,
      processStartTime: new Date(),
    });

    console.log(`[PipeQueueProcessor] 队列状态已更新为processing，taskId已保存`);
  } catch (error) {
    console.error(`[PipeQueueProcessor] 处理Pipe回调失败: ${queueId}`, error);

    // 增加重试次数
    if (queueItem.retryCount < 2) {
      await incrementPipeCallbackRetryCount(queueId, queueItem.retryCount);
      console.log(
        `[PipeQueueProcessor] 已安排重试: ${queueId}, 当前重试次数: ${queueItem.retryCount + 1}`,
      );
    } else {
      await markPipeCallbackFailed(queueId);
      console.log(`[PipeQueueProcessor] 重试次数已达上限，标记为失败: ${queueId}`);
    }
  }
}

/**
 * 检查并处理正在进行的Excel解析任务
 */
async function checkProcessingTasks(): Promise<void> {
  console.log('[PipeQueueProcessor] === 检查正在进行的Excel解析任务 ===');

  try {
    // 查询status为processing的队列项目
    const processingItems = await storage
      .entity('PipeCallbackQueue')
      .query()
      .equalTo('status', 'processing')
      .find();

    console.log(`[PipeQueueProcessor] 找到 ${processingItems.length} 个正在处理的任务`);

    for (const item of processingItems) {
      const queueId = item.objectId;
      const buildId = item.buildId;
      const taskId = item.excelParseTaskId;
      const excelUrl = item.excelParseUrl;

      if (!taskId || !excelUrl) {
        console.log(`[PipeQueueProcessor] 处理中的任务缺少taskId或URL，跳过: ${queueId}`);
        continue;
      }

      console.log(
        `[PipeQueueProcessor] 检查Excel解析任务状态: queueId=${queueId}, taskId=${taskId}`,
      );

      try {
        // 查询Excel解析任务状态
        const taskStatus = await getExcelParseTaskStatus(taskId);

        if (taskStatus.status === 'completed') {
          console.log(`[PipeQueueProcessor] Excel解析任务完成: ${taskId}`);

          // 处理解析结果
          await processExcelParseResult(taskStatus.result, buildId);

          // 标记队列为完成
          await updatePipeCallbackStatus(queueId, 'completed', new Date());

          console.log(`[PipeQueueProcessor] 队列处理完成: ${queueId}`);
        } else if (taskStatus.status === 'failed') {
          console.log(`[PipeQueueProcessor] Excel解析任务失败: ${taskId}`);

          // 增加重试次数或标记失败
          if (item.retryCount < 2) {
            await incrementPipeCallbackRetryCount(queueId, item.retryCount);
            console.log(`[PipeQueueProcessor] 已安排重试: ${queueId}`);
          } else {
            await markPipeCallbackFailed(queueId);
            console.log(`[PipeQueueProcessor] 重试次数已达上限，标记为失败: ${queueId}`);
          }
        } else {
          console.log(
            `[PipeQueueProcessor] Excel解析任务仍在进行中: ${taskId}, status=${taskStatus.status}`,
          );
        }
      } catch (error) {
        console.error(`[PipeQueueProcessor] 检查Excel解析任务状态失败: ${queueId}`, error);

        // 检查是否超时（超过10分钟认为超时）
        const startTime = item.processStartTime ? new Date(item.processStartTime) : new Date();
        const now = new Date();
        const timeoutMinutes = 10;

        if (now.getTime() - startTime.getTime() > timeoutMinutes * 60 * 1000) {
          console.log(`[PipeQueueProcessor] Excel解析任务超时，标记为失败: ${queueId}`);
          await markPipeCallbackFailed(queueId);
        }
      }
    }
  } catch (error) {
    console.error('[PipeQueueProcessor] 检查处理中任务失败:', error);
  }
}

/**
 * 队列消费主函数
 */
async function consumePipeCallbackQueue(): Promise<void> {
  console.log('[PipeQueueProcessor] === Pipe回调队列消费开始 ===');

  try {
    // 1. 先检查正在进行的Excel解析任务
    await checkProcessingTasks();

    // 2. 处理新的pending队列项目
    const pendingItems = await getPendingPipeCallbacks(3); // 每次处理3个

    if (pendingItems.length === 0) {
      console.log('[PipeQueueProcessor] 没有待处理的Pipe回调');
      return;
    }

    console.log(`[PipeQueueProcessor] 找到 ${pendingItems.length} 个待处理的Pipe回调`);

    // 并行处理多个回调
    const processingPromises = pendingItems.map(item => processPipeCallback(item));

    await Promise.allSettled(processingPromises);

    console.log('[PipeQueueProcessor] 本轮Pipe回调队列消费完成');
  } catch (error) {
    console.error('[PipeQueueProcessor] Pipe回调队列消费失败:', error);
  }
}

/**
 * Pipe回调队列消费器 - 由定时任务调用
 * 这个函数会被manifest.yml中的scheduledTrigger定时调用
 */
export async function processPipeCallbackQueue(): Promise<void> {
  console.log('[PipeQueueProcessor] === 定时任务：Pipe回调队列消费开始 ===');
  await consumePipeCallbackQueue();
}

/**
 * 手动触发队列消费（用于测试）
 */
export async function triggerPipeQueueConsumption(): Promise<void> {
  console.log('[PipeQueueProcessor] 手动触发队列消费');
  await consumePipeCallbackQueue();
}