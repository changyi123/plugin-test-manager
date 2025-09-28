import { storage } from '@giteeteam/apps-api';
import { axios, requestCoreApi } from '@giteeteam/apps-team-api';

import { batchUpdateItemsV2 } from '../../lib/coreApi';
import {
  getExecutionByBuildId,
  getPendingPipeCallbacks,
  getTestCaseMappingByBuildId,
  incrementPipeCallbackRetryCount,
  markPipeCallbackFailed,
  updateExecutionRecord,
  updatePipeCallbackStatus,
} from './database';

// Excel解析服务配置
function getExcelParseConfig() {
  const globalData = global as any;
  return {
    baseUrl: globalData.env?.EXCEL_PARSE_BASE_URL || 'http://gitee-proxima-word-export:3001',
  };
}

// 文件上传服务配置
function getFileUploadConfig() {
  return {
    baseUrl: 'http://gitee-proxima-atm:5678',
  };
}

// 获取租户key
function getTenantKey() {
  const globalData = global as any;
  console.log(`租户key为：${globalData.applicationId}`);
  return globalData.applicationId || 'osc';
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
async function submitExcelParseTask(excelUrl: string): Promise<{ taskId: string; status: string }> {
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
      response: error.response
        ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          }
        : '无响应数据',
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
 * 根据测试执行ID查找执行任务ID
 */
async function findExecutionTaskId(testExecutionId: string): Promise<string | null> {
  console.log(`[PipeQueueProcessor] 查找测试执行任务ID: ${testExecutionId}`);

  try {
    const searchParams = {
      iql: `id = '${testExecutionId}'`,
      displayContext: 'test_manager',
      isShowDetails: true,
      size: 1,
    };

    console.log(`[PipeQueueProcessor] 查询参数:`, JSON.stringify(searchParams, null, 2));

    const response = await requestCoreApi('POST', '/parse/api/search', searchParams);

    console.log(`[PipeQueueProcessor] 查询响应:`, JSON.stringify(response, null, 2));

    const items = (response as any)?.payload?.items || [];
    console.log(`[PipeQueueProcessor] 查询到 ${items.length} 个结果`);

    if (items.length === 0) {
      console.log(`[PipeQueueProcessor] 未找到测试执行: ${testExecutionId}`);
      console.log(`[PipeQueueProcessor] 尝试不使用displayContext再查询一次`);

      // 尝试不使用displayContext的查询
      const fallbackResponse = await requestCoreApi('POST', '/parse/api/search', {
        iql: `id = '${testExecutionId}'`,
        isShowDetails: true,
        size: 1,
      });

      console.log(
        `[PipeQueueProcessor] fallback查询响应:`,
        JSON.stringify(fallbackResponse, null, 2),
      );

      const fallbackItems = (fallbackResponse as any)?.payload?.items || [];
      if (fallbackItems.length === 0) {
        console.log(`[PipeQueueProcessor] fallback查询也未找到结果`);
        return null;
      }

      console.log(`[PipeQueueProcessor] fallback查询找到 ${fallbackItems.length} 个结果`);
      items.push(...fallbackItems);
    }

    const testExecution = items[0];
    console.log(`[PipeQueueProcessor] 测试执行详情:`, JSON.stringify(testExecution, null, 2));

    const linkItems = testExecution.values?.r_test_manager_linkItems;
    console.log(`[PipeQueueProcessor] r_test_manager_linkItems:`, linkItems);

    if (!linkItems || !Array.isArray(linkItems) || linkItems.length === 0) {
      console.log(`[PipeQueueProcessor] 测试执行没有关联的执行任务: ${testExecutionId}`);
      console.log(
        `[PipeQueueProcessor] 测试执行的所有字段:`,
        Object.keys(testExecution.values || {}),
      );
      return null;
    }

    const executionTaskId = linkItems[0];
    console.log(`[PipeQueueProcessor] 找到执行任务ID: ${testExecutionId} -> ${executionTaskId}`);
    return executionTaskId;
  } catch (error) {
    console.error('[PipeQueueProcessor] 查找执行任务ID失败:', error);
    console.error('[PipeQueueProcessor] 错误详情:', {
      message: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * 上传文件到测试执行任务
 */
async function uploadFileToExecutionTask(
  fileUrl: string,
  executionTaskId: string,
  tenant: string,
): Promise<void> {
  const config = getFileUploadConfig();
  console.log(`[PipeQueueProcessor] 上传文件: ${fileUrl} -> ${executionTaskId}`);
  console.log(`[PipeQueueProcessor] 上传配置: baseUrl=${config.baseUrl}, tenant=${tenant}`);

  const uploadUrl = `http://gitee-proxima-atm:5678/webhook/uploadFileToItem`;
  console.log('PipeQueueProcessor: 上传url', uploadUrl);
  const uploadData = {
    fileRef: fileUrl,
    itemId: executionTaskId,
    tenant: tenant,
  };

  console.log(`[PipeQueueProcessor] 上传URL: ${uploadUrl}`);
  console.log(`[PipeQueueProcessor] 上传数据:`, JSON.stringify(uploadData, null, 2));

  try {
    const response = await axios({
      method: 'POST',
      url: uploadUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      data: uploadData,
      timeout: 30000, // 30秒超时
    });

    console.log(`[PipeQueueProcessor] 文件上传成功: ${fileUrl} -> ${executionTaskId}`);
    console.log('[PipeQueueProcessor] 上传响应状态码:', response.status);
    console.log('[PipeQueueProcessor] 上传响应数据:', response.data);
  } catch (error) {
    console.error(`[PipeQueueProcessor] 文件上传失败: ${fileUrl} -> ${executionTaskId}`);
    console.error('[PipeQueueProcessor] 错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: uploadUrl,
      uploadData: uploadData,
    });
    throw error;
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
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED',
): Promise<void> {
  console.log(`[PipeQueueProcessor] 更新测试执行状态: ${testExecutionId} -> ${result}`);

  try {
    // 将结果映射到测试管理系统的状态值
    let testManagerStatus: string;
    switch (result) {
      case 'SUCCESS':
        testManagerStatus = 'PASSED';
        break;
      case 'FAILED':
        testManagerStatus = 'FAILED';
        break;
      case 'BLOCKED':
        testManagerStatus = 'BLOCK'; // 阻塞状态，表示流水线执行有问题或映射关系缺失
        break;
      default:
        testManagerStatus = 'FAILED'; // 默认为失败
    }

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

    console.log(
      `[PipeQueueProcessor] 准备更新测试执行状态: ${testExecutionId} -> ${testManagerStatus}`,
    );

    const updateResult = await batchUpdateItemsV2(updateParams);

    console.log(
      `[PipeQueueProcessor] 测试执行状态更新成功: ${testExecutionId} -> ${testManagerStatus}`,
    );
    console.log(`[PipeQueueProcessor] 更新结果:`, updateResult);
  } catch (error) {
    console.error(`[PipeQueueProcessor] 更新测试执行状态失败: ${testExecutionId}`, error);
    throw error;
  }
}

/**
 * 处理文件上传到执行任务
 */
async function processFileUploads(callbackData: PipeCallbackData, buildId: string): Promise<void> {
  console.log('[PipeQueueProcessor] 开始处理文件上传');

  const tenant = getTenantKey();
  const fileUrls = [
    { name: 'pipeLogFile', url: callbackData.pipeLogFile },
    { name: 'reportFile', url: callbackData.reportFile },
    { name: 'reportLogFile', url: callbackData.reportLogFile },
  ].filter(file => file.url && file.url.trim() !== ''); // 过滤掉空的URL

  console.log(`[PipeQueueProcessor] 找到 ${fileUrls.length} 个文件需要上传`);
  console.log('[PipeQueueProcessor] 文件列表:', fileUrls.map(f => ({ name: f.name, hasUrl: !!f.url })));

  // 获取测试用例映射关系
  const testCaseMapping = await getTestCaseMappingByBuildId(buildId);
  if (!testCaseMapping) {
    console.log('[PipeQueueProcessor] 未找到测试用例映射关系，无法上传文件');
    return;
  }

  console.log(
    '[PipeQueueProcessor] 测试用例映射关系详情:',
    JSON.stringify(testCaseMapping, null, 2),
  );

  // 获取所有的测试执行ID（去重）
  const testExecutionIds = Array.from(
    new Set(Object.values(testCaseMapping).map((data: any) => data.testExecutionId)),
  );

  console.log(`[PipeQueueProcessor] 需要上传文件的测试执行数量: ${testExecutionIds.length}`);
  console.log(`[PipeQueueProcessor] 测试执行ID列表:`, testExecutionIds);

  // 🚀 新逻辑：先收集所有执行任务ID，然后在执行任务级别去重
  const executionTaskIds = new Set<string>();
  
  // 为每个测试执行查找对应的执行任务ID
  for (const testExecutionId of testExecutionIds) {
    try {
      const executionTaskId = await findExecutionTaskId(testExecutionId);
      if (!executionTaskId) {
        console.log(
          `[PipeQueueProcessor] 测试执行 ${testExecutionId} 没有关联的执行任务，跳过文件上传`,
        );
        continue;
      }
      
      console.log(`[PipeQueueProcessor] 测试执行 ${testExecutionId} 关联执行任务 ${executionTaskId}`);
      executionTaskIds.add(executionTaskId);
    } catch (error) {
      console.error(`[PipeQueueProcessor] 查找测试执行 ${testExecutionId} 的执行任务失败:`, error);
    }
  }

  console.log(`[PipeQueueProcessor] 🎯 去重后需要上传文件的执行任务数量: ${executionTaskIds.size}`);
  console.log(`[PipeQueueProcessor] 🎯 执行任务ID列表:`, Array.from(executionTaskIds));

  // 为每个唯一的执行任务上传文件（避免重复上传）
  for (const executionTaskId of executionTaskIds) {
    try {
      console.log(
        `[PipeQueueProcessor] 为执行任务 ${executionTaskId} 上传 ${fileUrls.length} 个文件`,
      );

      // 串行上传所有文件到这个执行任务，避免并发冲突
      for (let i = 0; i < fileUrls.length; i++) {
        const file = fileUrls[i];
        try {
          console.log(`[PipeQueueProcessor] 开始上传文件 ${i + 1}/${fileUrls.length}: ${file.name} -> ${executionTaskId}`);
          await uploadFileToExecutionTask(file.url, executionTaskId, tenant);
          console.log(`[PipeQueueProcessor] 文件上传成功: ${file.name} -> ${executionTaskId}`);
          
          // 添加延迟避免接口并发冲突，最后一个文件不需要等待
          if (i < fileUrls.length - 1) {
            console.log(`[PipeQueueProcessor] 等待2秒后上传下一个文件...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
          }
        } catch (error) {
          console.error(
            `[PipeQueueProcessor] 文件上传失败: ${file.name} -> ${executionTaskId}`,
            error,
          );
          // 单个文件上传失败不影响其他文件的上传
        }
      }
    } catch (error) {
      console.error(`[PipeQueueProcessor] 处理执行任务 ${executionTaskId} 的文件上传失败:`, error);
    }
  }

  console.log('[PipeQueueProcessor] 文件上传处理完成');
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
        console.log(`[PipeQueueProcessor] 未找到TestID ${testId} 对应的测试执行映射关系`);
        console.log(
          `[PipeQueueProcessor] 这可能表示映射关系有问题，需要将相关测试执行设为BLOCKED状态`,
        );
        // 注意：这里不能直接跳过，因为我们需要标记测试执行为BLOCKED
        // 但目前我们无法确定具体是哪个测试执行，所以先记录为失败，后面会统一处理
        failedCount++;
      } else {
        // 更新测试执行状态
        await updateTestExecutionStatus(testExecutionId, result);

        if (result === 'SUCCESS') {
          successCount++;
        } else {
          failedCount++;
        }
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

  // 处理映射关系缺失的情况：将没有在Excel结果中找到对应TestID的测试执行设为BLOCKED状态
  await handleUnmappedTestExecutions(buildId, parseResult.data);

  // 更新AutomationExecutionRecord的统计信息
  try {
    console.log('[PipeQueueProcessor] ========= 准备更新执行记录统计信息 =========');
    console.log('[PipeQueueProcessor] buildId:', buildId);
    console.log(
      '[PipeQueueProcessor] 统计信息: successCount=',
      successCount,
      ', failedCount=',
      failedCount,
      ', skippedCount=',
      skippedCount,
    );

    // 先通过buildId查找执行记录
    // 使用已导入的 getExecutionByBuildId
    const execution = await getExecutionByBuildId(buildId);

    console.log('[PipeQueueProcessor] getExecutionByBuildId查询结果:');
    console.log(JSON.stringify(execution, null, 2));

    if (execution && execution.executionId) {
      console.log(
        '[PipeQueueProcessor] 找到执行记录，准备更新，executionId:',
        execution.executionId,
      );

      await updateExecutionRecord(execution.executionId, {
        status: failedCount > 0 ? 'completed_with_failures' : 'completed',
        completeTime: new Date(),
        successCount,
        failedCount,
        skippedCount,
      });

      console.log(
        `[PipeQueueProcessor] 更新执行记录统计信息成功: buildId=${buildId}, executionId=${execution.executionId}`,
      );
    } else {
      console.warn(`[PipeQueueProcessor] 未找到buildId ${buildId} 对应的执行记录`);
      console.warn('[PipeQueueProcessor] execution对象:', execution);
      console.warn('[PipeQueueProcessor] 跳过统计信息更新');
    }
  } catch (error) {
    console.error(`[PipeQueueProcessor] 更新执行记录统计信息失败: buildId=${buildId}`);
    console.error('[PipeQueueProcessor] 错误详情:', error);
    console.error('[PipeQueueProcessor] 错误消息:', error?.message);
    console.error('[PipeQueueProcessor] 错误堆栈:', error?.stack);
  }
}

/**
 * 处理映射关系缺失的测试执行
 * 将没有在Excel结果中找到对应TestID的测试执行标记为BLOCKED状态
 */
async function handleUnmappedTestExecutions(buildId: string, testRecords: any[]): Promise<void> {
  console.log('[PipeQueueProcessor] === 开始处理映射关系缺失的测试执行 ===');
  console.log('[PipeQueueProcessor] buildId:', buildId);
  console.log('[PipeQueueProcessor] Excel中的TestID数量:', testRecords.length);

  try {
    // 1. 获取该执行记录对应的所有测试执行ID
    // 使用已导入的 getExecutionByBuildId
    const execution = await getExecutionByBuildId(buildId);

    if (!execution || !execution.testExecutionIds) {
      console.warn('[PipeQueueProcessor] 未找到执行记录或测试执行ID列表为空');
      return;
    }

    const allTestExecutionIds = JSON.parse(execution.testExecutionIds);
    console.log('[PipeQueueProcessor] 该执行记录包含的所有测试执行ID:', allTestExecutionIds);

    // 2. 获取测试用例映射关系
    const testCaseMapping = execution.testCaseMapping ? JSON.parse(execution.testCaseMapping) : {};
    console.log('[PipeQueueProcessor] 测试用例映射关系数量:', Object.keys(testCaseMapping).length);

    // 3. 从Excel结果中提取已找到映射关系的TestID
    const excelTestIds = testRecords.map(record => record['Test ID']).filter(testId => testId);
    console.log('[PipeQueueProcessor] Excel中的TestID列表:', excelTestIds);

    // 4. 找出在映射关系中但不在Excel结果中的TestID
    const mappedTestIds = Object.keys(testCaseMapping);
    const unmappedTestIds = mappedTestIds.filter(testId => !excelTestIds.includes(testId));
    console.log('[PipeQueueProcessor] 映射关系中但不在Excel中的TestID:', unmappedTestIds);

    // 5. 对于每个unmapped的TestID，找到对应的测试执行ID并标记为BLOCKED
    for (const unmappedTestId of unmappedTestIds) {
      try {
        const mappingInfo = testCaseMapping[unmappedTestId];
        if (mappingInfo && mappingInfo.testExecutionId) {
          console.log(
            `[PipeQueueProcessor] 将测试执行 ${mappingInfo.testExecutionId} 标记为BLOCKED (TestID: ${unmappedTestId})`,
          );

          // 使用BLOCKED状态标记测试执行
          await updateTestExecutionStatus(mappingInfo.testExecutionId, 'BLOCKED');

          console.log(
            `[PipeQueueProcessor] 成功标记测试执行为BLOCKED: ${mappingInfo.testExecutionId}`,
          );
        }
      } catch (error) {
        console.error(
          `[PipeQueueProcessor] 标记测试执行为BLOCKED失败 (TestID: ${unmappedTestId}):`,
          error,
        );
      }
    }

    console.log(
      `[PipeQueueProcessor] 映射关系缺失处理完成，标记了 ${unmappedTestIds.length} 个测试执行为BLOCKED`,
    );
  } catch (error) {
    console.error('[PipeQueueProcessor] 处理映射关系缺失的测试执行失败:', error);
  }

  console.log('[PipeQueueProcessor] === 映射关系缺失处理完成 ===');
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
    // 原子操作：先抢占此任务，防止并发重复处理
    console.log(`[PipeQueueProcessor] 尝试抢占任务: ${queueId}`);

    // 使用条件更新来确保原子性：只有当状态为pending时才能更新为processing
    const currentItem = await storage
      .entity('PipeCallbackQueue')
      .query()
      .equalTo('objectId', queueId)
      .equalTo('status', 'pending')
      .first();

    if (!currentItem) {
      console.log(
        `[PipeQueueProcessor] 任务 ${queueId} 已被其他处理器抢占或状态不是pending，跳过处理`,
      );
      return;
    }

    // 设置为processing状态，标记开始处理时间
    await storage.entity('PipeCallbackQueue').set(queueId, {
      status: 'processing',
      processStartTime: new Date(),
    });

    console.log(`[PipeQueueProcessor] 成功抢占任务 ${queueId}，开始处理`);

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
    if (!callbackData.reportFile || callbackData.reportFile.trim() === '') {
      console.log(
        '[PipeQueueProcessor] ⚠️ 回调数据中没有报告文件或报告文件为空，将所有测试执行标记为阻塞状态',
      );
      console.log('[PipeQueueProcessor] reportFile值:', JSON.stringify(callbackData.reportFile));

      try {
        // 获取该buildId对应的执行记录
        // 使用已导入的 getExecutionByBuildId
        const execution = await getExecutionByBuildId(buildId);

        if (execution && execution.testExecutionIds) {
          // 解析测试执行ID列表
          const testExecutionIds = JSON.parse(execution.testExecutionIds);
          console.log(
            `[PipeQueueProcessor] 找到 ${testExecutionIds.length} 个测试执行需要标记为阻塞`,
          );

          // 将所有测试执行标记为阻塞状态
          for (const testExecutionId of testExecutionIds) {
            try {
              await updateTestExecutionStatus(testExecutionId, 'BLOCKED');
              console.log(
                `[PipeQueueProcessor] 已将测试执行 ${testExecutionId} 标记为BLOCKED (无报告文件)`,
              );
            } catch (error) {
              console.error(
                `[PipeQueueProcessor] 标记测试执行 ${testExecutionId} 为BLOCKED失败:`,
                error,
              );
            }
          }

          // 更新执行记录状态
          await updateExecutionRecord(execution.executionId, {
            status: 'completed_with_errors',
            completeTime: new Date(),
            errorMessage: 'Pipe回调未提供报告文件，无法获取测试执行结果',
            totalCount: testExecutionIds.length,
            successCount: 0,
            failedCount: 0,
            skippedCount: 0,
            blockedCount: testExecutionIds.length, // 全部标记为阻塞
          });

          console.log(
            `[PipeQueueProcessor] 执行记录已更新，${testExecutionIds.length} 个测试执行已标记为BLOCKED`,
          );
        } else {
          console.warn('[PipeQueueProcessor] 未找到执行记录或测试执行ID列表');
        }
      } catch (error) {
        console.error('[PipeQueueProcessor] 处理无报告文件的回调失败:', error);
      }

      // 更新队列状态为完成
      await updatePipeCallbackStatus(queueId, 'completed', new Date());
      console.log('[PipeQueueProcessor] 队列状态已更新为completed (无报告文件)');
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

      // 检查任务是否超时（30分钟）
      const processingTime = Date.now() - new Date(item.updatedAt || item.createdAt).getTime();
      const TIMEOUT_MS = 30 * 60 * 1000; // 30分钟超时

      if (processingTime > TIMEOUT_MS) {
        console.log(`[PipeQueueProcessor] 任务处理超时，自动标记为失败: queueId=${queueId}, 处理时间=${Math.round(processingTime/1000/60)}分钟`);
        await markPipeCallbackFailed(queueId);
        continue;
      }

      try {
        // 查询Excel解析任务状态
        const taskStatus = await getExcelParseTaskStatus(taskId);

        if (taskStatus.status === 'completed') {
          console.log(`[PipeQueueProcessor] Excel解析任务完成: ${taskId}`);

          // 获取原始回调数据用于文件上传
          let callbackData: PipeCallbackData;
          try {
            callbackData = JSON.parse(item.callbackData);
          } catch (error) {
            console.error(`[PipeQueueProcessor] 解析回调数据失败: ${queueId}`, error);
            callbackData = {} as PipeCallbackData;
          }

          // 先处理文件上传
          try {
            await processFileUploads(callbackData, buildId);
          } catch (error) {
            console.error(`[PipeQueueProcessor] 文件上传失败: ${queueId}`, error);
            // 文件上传失败不影响Excel解析结果的处理
          }

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
    // 1. 先检查正在进行的Excel解析任务（无论有多少个processing任务都要检查）
    await checkProcessingTasks();

    // 并发控制：检查是否有正在处理的Pipe回调任务，如果太多则跳过新任务处理
    const processingCount = await storage
      .entity('PipeCallbackQueue')
      .query()
      .equalTo('status', 'processing')
      .count();

    if (processingCount > 1) {
      console.log(`[PipeQueueProcessor] 发现 ${processingCount} 个Pipe回调任务正在处理中，跳过新任务处理`);
      return; // 只跳过新任务处理，但已经检查了现有任务
    }

    // 2. 处理新的pending队列项目
    const pendingItems = await getPendingPipeCallbacks(3); // 每次处理3个
    console.log('PipeQueueProcessor', JSON.stringify(pendingItems));

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
