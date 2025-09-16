import { storage } from '@giteeteam/apps-api';

import { executeCaseOperations } from './caseOperationExecutor';
import { getAutomationConfig, getCommitDiff, processFilesWithClosedLoop } from './codeApi';
import { CommitContext, processDecisionResults } from './operationsGenerator';

export async function processAutomationQueue() {
  console.log('[AutoSync] 开始处理队列...');

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
  console.log(`[AutoSync] 开始处理记录: ${record.objectId}`);

  try {
    await storage.entity('AutomationWebhookQueue').set(record.objectId, {
      status: 'processing',
    });

    const commitIds = JSON.parse(record.commitIds || '[]');
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

    for (const commitId of commitIds) {
      console.log(`[AutoSync] 处理commit: ${commitId}`);

      const diffData = await getCommitDiff(record.repositoryId, commitId);
      if (!diffData || !Array.isArray(diffData) || diffData.length === 0) {
        console.log(`[AutoSync] commit ${commitId} 没有变更文件`);
        continue;
      }

      // 使用T4.7-T4.9闭环逻辑处理文件变更
      const historyMappings = new Map(); // 历史映射数据，由T5.8内部获取
      const fileDecisions = processFilesWithClosedLoop(diffData, config, historyMappings);

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
        };

        console.log(`[DEBUG] =============== ABOUT TO CALL processDecisionResults ===============`);
        console.log(`[DEBUG] fileDecisions.length = ${fileDecisions.length}`);

        const caseOperations = await processDecisionResults(fileDecisions, config, commitContext);

        console.log(`[DEBUG] =============== processDecisionResults RETURNED ===============`);
        console.log(`[DEBUG] caseOperations.length = ${caseOperations.length}`);
        console.log(`[AutoSync] T5.8操作生成完成，共 ${caseOperations.length} 个用例操作`);

        if (caseOperations.length > 0) {
          // 使用T7.6批量执行器执行用例操作
          const executionSummary = await executeCaseOperations(
            caseOperations,
            commitContext.workspaceKey,
            commitContext, // 传递commitContext包含Git信息
          );

          console.log(
            `[AutoSync] T7.6执行完成: ${executionSummary.successful}/${executionSummary.total} 成功`,
          );
          console.log(`[AutoSync] 执行统计:`, executionSummary.stats);

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
      }
    }

    await storage.entity('AutomationWebhookQueue').set(record.objectId, {
      status: 'completed',
      processedTime: new Date(),
    });

    console.log(`[AutoSync] 记录处理完成: ${record.objectId}`);
  } catch (error) {
    console.error(`[AutoSync] 处理记录失败 [${record.objectId}]:`, error);

    // 增加重试次数
    const newRetryCount = (record.retryCount || 0) + 1;

    if (newRetryCount >= 3) {
      // 超过重试限制，标记为失败
      await storage.entity('AutomationWebhookQueue').set(record.objectId, {
        status: 'failed',
        retryCount: newRetryCount,
        processedTime: new Date(),
      });
      console.log(`记录已标记为失败: ${record.objectId}`);
    } else {
      // 重置为pending状态，等待下次处理
      await storage.entity('AutomationWebhookQueue').set(record.objectId, {
        status: 'pending',
        retryCount: newRetryCount,
      });
      console.log(`记录已重置为pending，重试次数: ${newRetryCount}`);
    }
  }
}
