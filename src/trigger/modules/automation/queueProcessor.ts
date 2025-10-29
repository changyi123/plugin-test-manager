import { storage } from '@giteeteam/apps-api';

import { executeCaseOperations } from './caseOperationExecutor';
import { getAutomationConfig, getCommitDiff, processFilesWithClosedLoop } from './codeApi';
import { CommitContext, processDecisionResults } from './operationsGenerator';
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

    const config = await getAutomationConfig(record.repositoryId, record.branchName);

    if (!config) {
      console.log('[AutoSync] 未找到配置文件，跳过处理');
      await storage.entity('AutomationWebhookQueue').set(record.objectId, {
        status: 'completed',
        processedTime: new Date(),
      });
      return;
    }

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
      console.log(`[AutoSync] 准备执行 ${allOperations.length} 个用例操作`);

      // 更新执行开始状态
      await updateExecutionStart(record.objectId, allOperations.length);

      // 创建执行上下文
      const executionContext: CommitContext = {
        repositoryId: record.repositoryId,
        commitId: commitIds[0], // 使用第一个commit作为代表
        branchName: record.branchName,
        workspaceKey: record.workspaceKey || '',
        gitCloneUrl: record.gitCloneUrl,
        gitBranch: record.gitBranch || record.branchName,
        gitPath: record.gitPath,
        testingFramework: config.testingFramework || 'JUnit',
        queueId: record.objectId,
      };

      // 使用T7.6批量执行器执行用例操作
      const executionSummary = await executeCaseOperations(
        allOperations,
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
