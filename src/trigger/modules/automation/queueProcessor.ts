import { storage } from '@giteeteam/apps-api';

import { executeCaseOperations } from './caseOperationExecutor';
import { getAutomationConfig, getCommitDiff, processFilesWithClosedLoop } from './codeApi';
import { CommitContext, processDecisionResults, CaseOperation } from './operationsGenerator';
import {
  cleanupOldLogs,
  markProcessingFailed,
  updateCurrentCommit,
  updateExecutionProgress,
  updateExecutionStart,
  updateQueueStartProcessing,
} from './queueStatistics';

export async function processAutomationQueue() {
  console.log('[AutoSync] 开始处理队列...');

  // 并发控制：检查是否有正在处理的任务
  const processingCount = await storage
    .entity('AutomationWebhookQueue')
    .query()
    .equalTo('status', 'processing')
    .count();

  if (processingCount > 0) {
    console.log(`[AutoSync] 发现 ${processingCount} 个任务正在处理中，跳过本次执行`);
    return; // 直接返回，等待下次定时任务
  }else{
    console.log(`[AutoSync] 发现 ${processingCount} 个任务正在处理中，开始本地执行`);
  }

  // 0. 定期清理旧日志 (每小时执行一次)
  const now = new Date();
  if (now.getMinutes() === 0) {
    // 整点时执行
    await cleanupOldLogs();
  }

  // 1. 先处理超时的processing状态记录 (超过10分钟视为超时)
  const timeoutThreshold = new Date(Date.now() - 18 * 60 * 1000); // 20分钟前
  const timeoutRecords = await storage
    .entity('AutomationWebhookQueue')
    .query()
    .equalTo('status', 'processing')
    .lessThan('updatedAt', timeoutThreshold)
    .limit(10)
    .find();

  if (timeoutRecords.length > 0) {
    console.log(
      `[AutoSync] 发现 ${timeoutRecords.length} 条超时的processing记录，重置为pending状态`,
    );
    for (const record of timeoutRecords) {
      const newRetryCount = (record.retryCount || 0) + 1;
      if (newRetryCount >= 3) {
        await storage.entity('AutomationWebhookQueue').set(record.objectId, {
          status: 'failed',
          retryCount: newRetryCount,
          processedTime: new Date(),
          errorMessage: '处理超时，已达最大重试次数',
        });
        console.log(`[AutoSync] 超时记录标记为失败: ${record.objectId}`);
      } else {
        await storage.entity('AutomationWebhookQueue').set(record.objectId, {
          status: 'pending',
          retryCount: newRetryCount,
        });
        console.log(
          `[AutoSync] 超时记录重置为pending: ${record.objectId}, 重试次数: ${newRetryCount}`,
        );
      }
    }
  }

  // 2. 处理正常的pending记录
  const pendingRecords = await storage
    .entity('AutomationWebhookQueue')
    .query()
    .equalTo('status', 'pending')
    .lessThan('retryCount', 3)
    .ascending('createdAt')
    .limit(5)
    .find();
  if (pendingRecords.length === 0) {
    console.log('[AutoSync] 没有待处理的记录');
    return;
  }

  console.log(`[AutoSync] 找到 ${pendingRecords.length} 条待处理记录`);

  for (const record of pendingRecords) {
    await processSingleRecord(record);
  }
}

async function processSingleRecord(record: any) {
  const startTime = new Date();
  console.log(`[AutoSync] =============== 开始处理记录 ===============`);
  console.log(`[AutoSync] 记录ID: ${record.objectId}`);
  console.log(`[AutoSync] 仓库: ${record.repositoryName}`);
  console.log(`[AutoSync] 分支: ${record.branchName}`);
  console.log(`[AutoSync] 重试次数: ${record.retryCount || 0}`);
  console.log(`[AutoSync] 开始时间: ${startTime.toISOString()}`);

  try {
    // 更新状态为processing，并记录开始时间
    await storage.entity('AutomationWebhookQueue').set(record.objectId, {
      status: 'processing',
      updatedAt: new Date(), // 重要：更新时间戳用于超时检测
    });

    const commitIds = JSON.parse(record.commitIds || '[]');

    // 初始化统计信息
    await updateQueueStartProcessing(record.objectId, commitIds.length);

    if (commitIds.length === 0) {
      console.log('[AutoSync] 没有commit需要处理');
      await storage.entity('AutomationWebhookQueue').set(record.objectId, {
        status: 'completed',
        processedTime: new Date(),
      });
      return;
    }

    console.log(`[AutoSync] 处理仓库: ${record.repositoryName}, 分支: ${record.branchName}`);
    console.log(`[AutoSync] 需要处理 ${commitIds.length} 个commit: ${commitIds.join(', ')}`);

    // 累计所有操作，最后统一执行
    const allOperations = [];

    for (const commitId of commitIds) {
      console.log(`[AutoSync] 处理commit: ${commitId}`);

      const diffData = await getCommitDiff(record.repositoryId, commitId);
      if (!diffData || !Array.isArray(diffData) || diffData.length === 0) {
        console.log(`[AutoSync] commit ${commitId} 没有变更文件`);
        continue;
      }

      // 更新当前处理的commit和文件数
      await updateCurrentCommit(record.objectId, commitId, diffData.length);

      // 获取当前commit时点的配置文件
      const config = await getAutomationConfig(record.repositoryId, commitId);
      
      if (!config) {
        console.log(`[AutoSync] commit ${commitId} 未找到配置文件，跳过处理`);
        continue;
      }

      // 使用T4.7-T4.9闭环逻辑处理文件变更
      const historyMappings = new Map(); // 历史映射数据，由T5.8内部获取
      const fileDecisions = await processFilesWithClosedLoop(
        diffData,
        config,
        historyMappings,
        record.objectId,
        commitId,
      );

      console.log(`[AutoSync] 闭环决策完成，需要处理 ${fileDecisions.length} 个文件`);

      if (fileDecisions.length > 0) {
        // 使用T5.8生成用例操作列表
        const commitContext: CommitContext = {
          repositoryId: record.repositoryId,
          commitId: commitId,
          branchName: record.branchName,
          workspaceKey: record.workspaceKey || '', // 从队列记录获取工作空间key
          // 添加Git相关信息
          gitCloneUrl: record.gitCloneUrl,
          gitBranch: record.gitBranch || record.branchName,
          gitPath: record.gitPath,
          // 添加测试框架信息
          testingFramework: config.testingFramework || 'JUnit',
          // 传递queueId用于统计
          queueId: record.objectId,
        };

        console.log(`[DEBUG] =============== ABOUT TO CALL processDecisionResults ===============`);
        console.log(`[DEBUG] fileDecisions.length = ${fileDecisions.length}`);

        const caseOperations = await processDecisionResults(fileDecisions, config, commitContext);

        console.log(`[DEBUG] =============== processDecisionResults RETURNED ===============`);
        console.log(`[DEBUG] caseOperations.length = ${caseOperations.length}`);
        console.log(`[AutoSync] T5.8操作生成完成，共 ${caseOperations.length} 个用例操作`);

        // 累积所有操作，稍后统一执行
        allOperations.push(...caseOperations);
      }
    }

    // 统一执行所有操作
    if (allOperations.length > 0) {
      console.log(`[AutoSync] 原始操作数: ${allOperations.length} 个用例操作`);

      // 合并冲突操作
      const { mergedOperations, mergeInfo } = mergeConflictingOperations(allOperations);
      console.log(`[AutoSync] 合并后操作数: ${mergedOperations.length} 个用例操作`);

      if (mergeInfo.count > 0) {
        console.log(`[AutoSync] 合并信息: 合并了${mergeInfo.count}个重复操作，涉及${mergeInfo.duplicateTestIds.length}个testId`);
        console.log(`[AutoSync] 重复的testId: ${mergeInfo.duplicateTestIds.join(', ')}`);
      }

      // 更新执行开始状态，传入合并信息
      await updateExecutionStart(record.objectId, mergedOperations.length, mergeInfo.count > 0 ? mergeInfo : undefined);

      // 获取最新配置用于执行上下文
      const latestConfig = await getAutomationConfig(record.repositoryId, record.branchName);

      // 创建执行上下文
      const executionContext: CommitContext = {
        repositoryId: record.repositoryId,
        commitId: commitIds[0], // 使用第一个commit作为代表
        branchName: record.branchName,
        workspaceKey: record.workspaceKey || '',
        gitCloneUrl: record.gitCloneUrl,
        gitBranch: record.gitBranch || record.branchName,
        gitPath: record.gitPath,
        testingFramework: latestConfig?.testingFramework || 'JUnit',
        queueId: record.objectId,
      };

      // 使用T7.6批量执行器执行用例操作
      const executionSummary = await executeCaseOperations(
        mergedOperations,
        executionContext.workspaceKey,
        executionContext, // 传递执行上下文
      );

      console.log(
        `[AutoSync] T7.6执行完成: ${executionSummary.successful}/${executionSummary.total} 成功`,
      );
      console.log(`[AutoSync] 执行统计:`, executionSummary.stats);

      // 更新执行结果统计
      await updateExecutionProgress(record.objectId, executionSummary);

      // 如果有失败的操作，记录详细信息
      const failedResults = executionSummary.results.filter(r => !r.success);
      if (failedResults.length > 0) {
        console.log(`[AutoSync] 失败操作详情:`);
        failedResults.forEach(result => {
          console.log(
            `[AutoSync] - ${result.operation.operationType} ${result.operation.testId}: ${result.error}`,
          );
        });
      }
    }

    const endTime = new Date();
    const processingDuration = endTime.getTime() - startTime.getTime();

    await storage.entity('AutomationWebhookQueue').set(record.objectId, {
      status: 'completed',
      processedTime: endTime,
      updatedAt: endTime,
    });

    console.log(`[AutoSync] =============== 记录处理完成 ===============`);
    console.log(`[AutoSync] 记录ID: ${record.objectId}`);
    console.log(
      `[AutoSync] 处理耗时: ${processingDuration}ms (${(processingDuration / 1000).toFixed(2)}秒)`,
    );
    console.log(`[AutoSync] 完成时间: ${endTime.toISOString()}`);
    console.log(`[AutoSync] ===============================================`);
  } catch (error) {
    const endTime = new Date();
    const processingDuration = endTime.getTime() - startTime.getTime();

    console.error(`[AutoSync] =============== 处理记录失败 ===============`);
    console.error(`[AutoSync] 记录ID: ${record.objectId}`);
    console.error(`[AutoSync] 仓库: ${record.repositoryName}`);
    console.error(
      `[AutoSync] 失败耗时: ${processingDuration}ms (${(processingDuration / 1000).toFixed(2)}秒)`,
    );
    console.error(`[AutoSync] 错误详情:`, error);
    console.error(`[AutoSync] 错误堆栈:`, error?.stack);

    // 更新失败统计
    const errorMessage = error?.message || error?.toString() || '未知错误';
    await markProcessingFailed(record.objectId, errorMessage);

    // 增加重试次数
    const newRetryCount = (record.retryCount || 0) + 1;

    if (newRetryCount >= 3) {
      // 超过重试限制，标记为失败
      await storage.entity('AutomationWebhookQueue').set(record.objectId, {
        status: 'failed',
        retryCount: newRetryCount,
        processedTime: endTime,
        updatedAt: endTime,
        errorMessage: `重试${newRetryCount}次后失败: ${errorMessage}`,
      });
      console.error(`[AutoSync] 记录已标记为失败: ${record.objectId}, 重试次数: ${newRetryCount}`);
    } else {
      // 重置为pending状态，等待下次处理
      await storage.entity('AutomationWebhookQueue').set(record.objectId, {
        status: 'pending',
        retryCount: newRetryCount,
        updatedAt: endTime,
        errorMessage: `第${newRetryCount}次重试: ${errorMessage}`,
      });
      console.log(`[AutoSync] 记录已重置为pending，重试次数: ${newRetryCount}`);
    }
    console.error(`[AutoSync] ===============================================`);
  }
}

/**
 * 合并冲突的操作
 * 解决多个commit对同一testId产生的冲突操作
 */
function mergeConflictingOperations(operations: CaseOperation[]): {
  mergedOperations: CaseOperation[];
  mergeInfo: { count: number; duplicateTestIds: string[] };
} {
  console.log(`[MergeOps] 开始合并操作，原始操作数: ${operations.length}`);

  // 按testId分组
  const operationsByTestId = new Map<string, CaseOperation[]>();

  for (const operation of operations) {
    const testId = operation.testId;
    if (!operationsByTestId.has(testId)) {
      operationsByTestId.set(testId, []);
    }
    operationsByTestId.get(testId)!.push(operation);
  }

  console.log(`[MergeOps] 发现 ${operationsByTestId.size} 个唯一testId`);

  const mergedOperations: CaseOperation[] = [];
  let mergedCount = 0;
  const duplicateTestIds: string[] = [];

  for (const [testId, ops] of operationsByTestId) {
    if (ops.length === 1) {
      // 没有冲突，直接保留
      mergedOperations.push(ops[0]);
    } else {
      // 有冲突，需要合并
      console.log(`[MergeOps] testId="${testId}" 有 ${ops.length} 个冲突操作，开始合并`);
      duplicateTestIds.push(testId); // 记录重复的testId
      const merged = mergeOperationsForSameTestId(testId, ops);
      if (merged) {
        mergedOperations.push(merged);
        mergedCount += ops.length - 1; // 记录合并掉的操作数
      }
    }
  }

  console.log(`[MergeOps] 合并完成：${operations.length} → ${mergedOperations.length} (合并了${mergedCount}个操作)`);

  return {
    mergedOperations,
    mergeInfo: {
      count: mergedCount,
      duplicateTestIds,
    },
  };
}

/**
 * 合并同一testId的多个操作
 * 按照commit时间顺序应用合并规则
 */
function mergeOperationsForSameTestId(testId: string, operations: CaseOperation[]): CaseOperation | null {
  if (operations.length === 0) return null;
  if (operations.length === 1) return operations[0];
  
  console.log(`[MergeOps] 合并testId="${testId}"的操作:`, operations.map(op => op.operationType).join(' → '));
  
  // 按照时间顺序排序（假设数组已经是按commit顺序）
  let result = operations[0];
  
  for (let i = 1; i < operations.length; i++) {
    const current = operations[i];
    result = mergeTwoOperations(result, current);
    
    console.log(`[MergeOps]   ${result?.operationType || 'NULL'} + ${current.operationType} → ${result?.operationType || 'NULL'}`);
    
    if (!result) {
      // 操作被完全抵消了
      break;
    }
  }
  
  if (result) {
    console.log(`[MergeOps] testId="${testId}" 最终操作: ${result.operationType}`);
  } else {
    console.log(`[MergeOps] testId="${testId}" 操作被完全抵消`);
  }
  
  return result;
}

/**
 * 合并两个操作的核心逻辑
 */
function mergeTwoOperations(first: CaseOperation, second: CaseOperation): CaseOperation | null {
  const firstType = first.operationType;
  const secondType = second.operationType;
  
  // 合并规则
  if (firstType === 'CREATE' && secondType === 'DELETE') {
    // CREATE + DELETE → 抵消
    return null;
  }
  
  if (firstType === 'DELETE' && secondType === 'CREATE') {
    // DELETE + CREATE → UPDATE (使用CREATE的数据，但标记为UPDATE)
    return {
      ...second,
      operationType: 'UPDATE',
      // 保留CREATE的数据，但作为UPDATE执行
    };
  }
  
  if (firstType === 'CREATE' && secondType === 'UPDATE') {
    // CREATE + UPDATE → CREATE (合并数据，保持CREATE)
    return {
      ...second, // 使用UPDATE的最新数据
      operationType: 'CREATE',
    };
  }
  
  if (firstType === 'UPDATE' && secondType === 'DELETE') {
    // UPDATE + DELETE → DELETE
    return second;
  }
  
  if (firstType === 'UPDATE' && secondType === 'UPDATE') {
    // UPDATE + UPDATE → UPDATE (使用最后的数据)
    return second;
  }
  
  if (firstType === 'CREATE' && secondType === 'CREATE') {
    // CREATE + CREATE → CREATE (使用最后的数据)
    return second;
  }
  
  if (firstType === 'DELETE' && secondType === 'DELETE') {
    // DELETE + DELETE → DELETE (重复删除，保留一个)
    return second;
  }
  
  if ((firstType === 'MIGRATE' && secondType === 'DELETE') || 
      (firstType === 'DELETE' && secondType === 'MIGRATE')) {
    // MIGRATE + DELETE 或 DELETE + MIGRATE → DELETE
    return { ...second, operationType: 'DELETE' };
  }
  
  if (firstType === 'MIGRATE' && secondType === 'UPDATE') {
    // MIGRATE + UPDATE → UPDATE (最新数据)
    return second;
  }
  
  if (firstType === 'UPDATE' && secondType === 'MIGRATE') {
    // UPDATE + MIGRATE → MIGRATE (位置变更优先)
    return second;
  }
  
  // 默认情况：使用第二个操作（时间上更新的）
  return second;
}
