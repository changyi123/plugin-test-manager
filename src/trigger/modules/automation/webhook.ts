import { storage } from '@giteeteam/apps-api';
import { axios } from '@giteeteam/apps-team-api';

import { buildResponse } from '../../lib/apiUtil';

export interface WebhookPayload {
  action: string;
  event_name: string;
  project: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    clone_url: string;
    enterprise_uuid: string;
    program_uuid: string; // 工作空间key - 添加此字段
  };
  commits: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
      user_name: string;
    };
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  head_commit: {
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    modified: string[];
  };
  timestamp: string;
}

// Pipe调用参数接口
export interface PipeWebHookParams {
  executionId: string;
  testExecutionIds: string[];
  testCases: Array<{
    executionId: string;
    testExecutionId: string; // 添加测试执行ID
    caseId: string;
    caseName: string;
    repository: string;
    testId: string;
    filePath: string;
    className: string;
    methodName: string;
    modulePath: string;
    framework: string;
    startLine: number;
    gitCloneUrl: string;
    gitBranch: string;
    gitPath: string;
  }>;
  mavenVersion: string;
  jdkVersion: string;
  executionType: string;
  gitCloneUrl?: string;
  gitBranch?: string;
  gitPath?: string;
}

/**
 * 获取Pipe配置
 */
function getPipeConfig() {
  const globalData = global as any;

  return {
    baseUrl: globalData.env?.PIPE_BASE_URL || 'http://pipe-uat.gitee.work',
    token:
      globalData.env?.PIPE_TOKEN ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZGlzcGxheU5hbWUiOiJvc2MtYWRtaW4iLCJuaWNrTmFtZSI6Im9zYy1hZG1pbiJ9.xnxeJb0rFavy921iyqe3milDiRkNVVLz_Zdw8fTDPTw',
    secret: globalData.env?.PIPE_SECRET || 'b5c7f49902584ff0887d0c145523c683',
  };
}

/**
 * 根据仓库和分支对测试用例进行分组
 */
function groupTestCasesByRepo(testCases: any[]): Map<string, any[]> {
  const groupMap = new Map();

  testCases.forEach(testCase => {
    const key = `${testCase.gitCloneUrl}#${testCase.gitBranch}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key).push(testCase);
  });

  return groupMap;
}

/**
 * 构建CASE_LIST字符串，格式: "className#methodName,className#methodName"
 */
function buildCaseListString(testCases: any[]): string {
  const caseStrings = testCases
    .filter(tc => tc.className && tc.methodName)
    .map(tc => `${tc.className}#${tc.methodName}`);

  return caseStrings.join(',');
}

/**
 * 分批处理测试用例（每批CASE_LIST不超过10000字符）
 */
function batchTestCases(testCases: any[], maxLength = 10000): any[][] {
  const batches = [];
  let currentBatch = [];
  let currentLength = 0;

  for (const testCase of testCases) {
    const caseString = `${testCase.className}#${testCase.methodName}`;
    const addLength = currentLength === 0 ? caseString.length : caseString.length + 1; // +1 for comma

    if (currentLength + addLength > maxLength && currentBatch.length > 0) {
      // 当前批次已满，开始新批次
      batches.push([...currentBatch]);
      currentBatch = [testCase];
      currentLength = caseString.length;
    } else {
      currentBatch.push(testCase);
      currentLength += addLength;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * 调用Pipe WebHook接口
 */
export async function callPipeWebHook(
  params: PipeWebHookParams,
): Promise<{ buildId: string; pipeJumpUrl: string; testCaseMapping: Record<string, any> }> {
  console.log('[Pipe] 开始调用Pipe WebHook，测试用例数量:', params.testCases.length);

  try {
    const pipeConfig = getPipeConfig();
    console.log('[Pipe] 使用配置:', {
      baseUrl: pipeConfig.baseUrl,
      hasToken: !!pipeConfig.token,
      hasSecret: !!pipeConfig.secret,
    });

    // 构建测试用例映射关系 - 只使用TestID映射
    const testCaseMapping: Record<string, any> = {};

    params.testCases.forEach(testCase => {
      const executionData = {
        testExecutionId: testCase.testExecutionId || testCase.executionId,
        caseId: testCase.caseId,
        caseName: testCase.caseName,
        repository: testCase.repository,
        filePath: testCase.filePath,
        className: testCase.className,
        methodName: testCase.methodName,
        testId: testCase.testId, // 用例唯一标识
      };

      // 通过TestID映射（主要映射方式，Excel中会用到）
      if (testCase.testId) {
        testCaseMapping[testCase.testId] = executionData;
        console.log(
          `[Pipe] 添加TestID映射: ${testCase.testId} -> 执行${executionData.testExecutionId}`,
        );
      }
    });

    console.log('[Pipe] 构建映射关系完成，共', Object.keys(testCaseMapping).length, '个映射条目');

    // 按仓库和分支分组
    const repoGroups = groupTestCasesByRepo(params.testCases);
    console.log('[Pipe] 分组结果，共', repoGroups.size, '个仓库分支组合');

    const results = [];

    // 遍历每个仓库分支组合
    for (const [repoKey, groupTestCases] of repoGroups) {
      const [gitCloneUrl, gitBranch] = repoKey.split('#');
      const gitPath = groupTestCases[0]?.gitPath || '';

      console.log(
        `[Pipe] 处理仓库组: ${gitCloneUrl}, 分支: ${gitBranch}, 用例数量: ${groupTestCases.length}`,
      );
      console.log('[Pipe] Git参数详情:');
      console.log(`[Pipe]   - gitCloneUrl: "${gitCloneUrl}"`);
      console.log(`[Pipe]   - gitBranch: "${gitBranch}"`);
      console.log(`[Pipe]   - gitPath: "${gitPath}"`);
      console.log('[Pipe] 第一个测试用例的Git信息:', {
        gitCloneUrl: groupTestCases[0]?.gitCloneUrl,
        gitBranch: groupTestCases[0]?.gitBranch,
        gitPath: groupTestCases[0]?.gitPath,
      });

      // 检查所有测试用例的gitPath是否一致
      const allGitPaths = groupTestCases.map(tc => tc.gitPath).filter(Boolean);
      const uniqueGitPaths = Array.from(new Set(allGitPaths));
      console.log(
        `[Pipe] 该组测试用例的gitPath情况: 共${allGitPaths.length}个有效值, ${uniqueGitPaths.length}个唯一值`,
      );
      console.log('[Pipe] 唯一gitPath值:', uniqueGitPaths);

      // 分批处理（每批CASE_LIST不超过10000字符）
      const batches = batchTestCases(groupTestCases);
      console.log(`[Pipe] 该组需要分${batches.length}批处理`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const caseList = buildCaseListString(batch);

        console.log(
          `[Pipe] 批次 ${i + 1}/${batches.length}，用例数量: ${batch.length}，CASE_LIST长度: ${
            caseList.length
          }`,
        );

        const requestData = {
          allParams: {
            GIT_CODE_CLONE_URL: gitCloneUrl,
            GIT_CODE_BRANCH: gitBranch,
            GIT_CODE_PATH: gitPath,
            JDK_VERSION: params.jdkVersion,
            MAVEN_VERSION: params.mavenVersion,
            CASE_LIST: caseList,
          },
          materialParams: [],
          secret: pipeConfig.secret,
          token: pipeConfig.token,
        };

        console.log('[Pipe] 最终Pipe请求参数检查:');
        console.log(`[Pipe]   - GIT_CODE_CLONE_URL: "${requestData.allParams.GIT_CODE_CLONE_URL}"`);
        console.log(`[Pipe]   - GIT_CODE_BRANCH: "${requestData.allParams.GIT_CODE_BRANCH}"`);
        console.log(`[Pipe]   - GIT_CODE_PATH: "${requestData.allParams.GIT_CODE_PATH}"`);
        console.log(`[Pipe]   - CASE_LIST: "${requestData.allParams.CASE_LIST}"`);
        console.log(`[Pipe]   - JDK_VERSION: "${requestData.allParams.JDK_VERSION}"`);
        console.log(`[Pipe]   - MAVEN_VERSION: "${requestData.allParams.MAVEN_VERSION}"`);
        console.log('[Pipe] 发送请求数据:', JSON.stringify(requestData, null, 2));

        const response = await axios({
          method: 'POST',
          url: `${pipeConfig.baseUrl}/api/ipipe/pipeline/rest/v1/openApi/webHook`,
          data: requestData,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log(
          `[Pipe] 批次 ${i + 1}/${batches.length} 完整响应数据:`,
          JSON.stringify(response.data, null, 2),
        );
        console.log(`[Pipe] 批次 ${i + 1} 响应状态码:`, response.status);
        console.log(`[Pipe] 批次 ${i + 1} 响应头:`, response.headers);

        // 构建返回结果 - 根据实际Pipe响应数据结构提取字段
        const buildId = response.data?.buildId || response.data?.pipelineBuildId;
        const pipeJumpUrl = 
          response.data?.jumpUrl || 
          response.data?.pipeJmpUrl || 
          response.data?.pipeJumpUrl ||
          `${pipeConfig.baseUrl.replace('http://pipe-uat', 'https://pipe')}/builds/${buildId}`;

        console.log(`[Pipe] 提取的buildId: ${buildId}`);
        console.log(`[Pipe] 提取的pipeJumpUrl: ${pipeJumpUrl}`);

        results.push({
          buildId: String(buildId),
          pipeJumpUrl,
          batch: i + 1,
          totalBatches: batches.length,
          caseCount: batch.length,
          repoKey,
        });
      }
    }

    console.log('[Pipe] === 所有批次处理完成 ===');
    console.log('[Pipe] 总批次数量:', results.length);
    console.log('[Pipe] 所有结果汇总:', JSON.stringify(results, null, 2));

    // 返回第一个结果作为主要结果，其他结果在日志中记录
    const mainResult = results[0];
    if (results.length > 1) {
      console.log('[Pipe] 多批次执行，使用第一个结果作为主要结果');
      console.log('[Pipe] 主要结果buildId:', mainResult.buildId);
    }

    return {
      buildId: mainResult.buildId,
      pipeJumpUrl: mainResult.pipeJumpUrl,
      testCaseMapping: testCaseMapping,
    };
  } catch (error) {
    console.error('[Pipe] WebHook调用失败:', error);
    throw new Error(`Pipe接口调用失败: ${error.message}`);
  }
}

export const automationWebhook = async params => {
  // webhook 数据在 params.payload 中
  const payload = params.payload || params;

  try {
    const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';

    console.log(
      `[AutomationWebhook] Processing branch: ${branch}, repository: ${payload.project?.name}`,
    );

    // 获取工作空间key，从多个来源尝试
    const workspaceKey =
      payload.project?.program_uuid || // webhook payload中的program_uuid
      payload.workspace?.key || // 可能的workspace对象
      payload.headers?.['x-proxima-workspacekey'] || // 请求头
      '';

    const queueData = {
      webhookUuid: payload.uuid || `${payload.hook_id}_${Date.now()}`,
      repositoryId: String(payload.project?.id || payload.repository?.id),
      repositoryName: payload.project?.name || payload.repository?.name,
      branchName: branch,
      commitIds: JSON.stringify(payload.commits?.map((c: any) => c.id) || []),
      workspaceKey: workspaceKey,
      // 添加Git相关信息
      gitCloneUrl: payload.project?.git_ssh_url || '',
      gitBranch: branch, // payload.ref 已处理为 branch
      gitPath: payload.project?.full_path || '',
      status: 'pending',
      retryCount: 0,
    };

    console.log('[AutomationWebhook] 准备写入队列数据:', JSON.stringify(queueData));

    try {
      const result = await storage.entity('AutomationWebhookQueue').add(queueData);
      console.log('[AutomationWebhook] 队列写入成功，result:', JSON.stringify(result));

      return buildResponse({
        success: true,
        queueId: result,
      });
    } catch (storageError) {
      console.error('[AutomationWebhook] 队列写入失败:', storageError);
      console.error('[AutomationWebhook] 错误详情:', JSON.stringify(storageError));
      throw storageError;
    }
  } catch (error) {
    console.error('[AutomationWebhook] 处理webhook失败:', error);
    return buildResponse({
      success: false,
      error: error.message,
    });
  }
};
