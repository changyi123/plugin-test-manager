import { storage } from '@giteeteam/apps-api';

export async function saveWebhookToQueue(data: {
  webhookUuid: string;
  repositoryId: string;
  repositoryName: string;
  branchName: string;
  commitIds: string[];
  payload: any;
}) {
  const queueData = {
    webhookUuid: data.webhookUuid,
    repositoryId: data.repositoryId,
    repositoryName: data.repositoryName,
    branchName: data.branchName,
    commitIds: JSON.stringify(data.commitIds),
    payload: JSON.stringify(data.payload),
    status: 'pending',
    retryCount: 0,
  };

  return await storage.entity('AutomationWebhookQueue').add(queueData);
}

export async function getPendingWebhooks(limit = 5) {
  return await storage
    .entity('AutomationWebhookQueue')
    .query()
    .equalTo('status', 'pending')
    .lessThan('retryCount', 3)
    .ascending('createdAt')
    .limit(limit)
    .find();
}

export async function updateWebhookStatus(queueId: string, status: string, processedTime?: Date) {
  const updateData: any = { status };
  if (processedTime) {
    updateData.processedTime = processedTime;
  }

  return await storage.entity('AutomationWebhookQueue').set(queueId, updateData);
}

export async function incrementRetryCount(queueId: string, currentRetryCount: number) {
  return await storage.entity('AutomationWebhookQueue').set(queueId, {
    retryCount: currentRetryCount + 1,
    status: 'pending',
  });
}

export async function markWebhookFailed(queueId: string) {
  return await storage.entity('AutomationWebhookQueue').set(queueId, {
    status: 'failed',
    processedTime: new Date(),
  });
}

export async function saveSyncLog(data: {
  webhookQueueId: string;
  repositoryId: string;
  repositoryName: string;
  commitId: string;
  branchName: string;
  syncStatus: string;
  processedFiles?: number;
  createdCases?: number;
  updatedCases?: number;
  skippedCases?: number;
  failedCases?: number;
  errorDetails?: string;
  syncStartTime: Date;
  syncEndTime?: Date;
}) {
  return await storage.entity('AutomationSyncLog').add(data);
}

export async function saveCaseMapping(data: {
  caseId: string;
  automationCaseId: string;
  repositoryId: string;
  repositoryName: string;
  filePath: string;
  testClassName?: string;
  testMethodName: string;
  testingFramework?: string;
  branchName: string;
  moduleId: string;
  modulePath: string;
  lastCommitId?: string;
  lastSyncTime?: Date;
  isActive?: boolean;
}) {
  const existing = await storage
    .entity('AutomationCaseMapping')
    .query()
    .equalTo('automationCaseId', data.automationCaseId)
    .first();

  const mappingData = {
    ...data,
    lastSyncTime: data.lastSyncTime || new Date(),
    isActive: data.isActive !== undefined ? data.isActive : true,
  };

  if (existing) {
    return await storage.entity('AutomationCaseMapping').set(existing.objectId, mappingData);
  } else {
    return await storage.entity('AutomationCaseMapping').add(mappingData);
  }
}

export async function getCaseMappingByAutomationId(automationCaseId: string) {
  return await storage
    .entity('AutomationCaseMapping')
    .query()
    .equalTo('automationCaseId', automationCaseId)
    .first();
}

export async function getCaseMappingsByRepository(repositoryId: string) {
  return await storage
    .entity('AutomationCaseMapping')
    .query()
    .equalTo('repositoryId', repositoryId)
    .equalTo('isActive', true)
    .find();
}

// AutomationExecutionRecord 数据库操作函数
export async function createExecutionRecord(data: {
  executionId: string;
  buildId?: string;
  testExecutionIds: string[];
  testCaseMapping?: Record<string, any>;
  mavenVersion: string;
  jdkVersion: string;
  status: string;
  triggerTime: Date;
  triggerUser: string;
  workspaceKey: string;
  pipeJumpUrl?: string;
  pipeLogUrl?: string;
  reportUrl?: string;
  reportLogUrl?: string;
  errorMessage?: string;
  totalCount?: number;
  successCount?: number;
  failedCount?: number;
  skippedCount?: number;
}) {
  console.log('[database.createExecutionRecord] 接收到数据:', data);

  const recordData = {
    executionId: data.executionId,
    buildId: data.buildId || '',
    testExecutionIds: JSON.stringify(data.testExecutionIds),
    testCaseMapping: data.testCaseMapping ? JSON.stringify(data.testCaseMapping) : '',
    mavenVersion: data.mavenVersion,
    jdkVersion: data.jdkVersion,
    status: data.status,
    triggerTime: data.triggerTime,
    triggerUser: data.triggerUser,
    workspaceKey: data.workspaceKey,
    pipeJumpUrl: data.pipeJumpUrl || '',
    pipeLogUrl: data.pipeLogUrl || '',
    reportUrl: data.reportUrl || '',
    reportLogUrl: data.reportLogUrl || '',
    errorMessage: data.errorMessage || '',
    totalCount: data.totalCount || data.testExecutionIds.length,
    successCount: data.successCount || 0,
    failedCount: data.failedCount || 0,
    skippedCount: data.skippedCount || 0,
  };

  console.log(
    '[database.createExecutionRecord] 准备写入storage的数据:',
    JSON.stringify(recordData, null, 2),
  );

  try {
    const result = await storage.entity('AutomationExecutionRecord').add(recordData);
    console.log('[database.createExecutionRecord] ========= storage.add完整返回结果 =========');
    console.log(JSON.stringify(result, null, 2));
    console.log('[database.createExecutionRecord] ========= 返回结果解析 =========');
    console.log('[database.createExecutionRecord] result类型:', typeof result);
    console.log('[database.createExecutionRecord] result是否为null:', result === null);
    console.log('[database.createExecutionRecord] result是否为undefined:', result === undefined);
    if (result && typeof result === 'object') {
      console.log('[database.createExecutionRecord] result的所有key:', Object.keys(result));
      console.log('[database.createExecutionRecord] result.objectId:', (result as any).objectId);
      console.log('[database.createExecutionRecord] result.id:', (result as any).id);
      console.log(
        '[database.createExecutionRecord] result.executionId:',
        (result as any).executionId,
      );
      console.log('[database.createExecutionRecord] result.buildId:', (result as any).buildId);
    }
    console.log('[database.createExecutionRecord] ==========================================');
    return result;
  } catch (error) {
    console.error('[database.createExecutionRecord] storage.add失败:', error);
    throw error;
  }
}

export async function updateExecutionRecord(
  executionId: string,
  updateData: {
    buildId?: string;
    status?: string;
    completeTime?: Date;
    pipeJumpUrl?: string;
    pipeLogUrl?: string;
    reportUrl?: string;
    reportLogUrl?: string;
    errorMessage?: string;
    totalCount?: number;
    successCount?: number;
    failedCount?: number;
    skippedCount?: number;
    blockedCount?: number;
    testCaseMapping?: string;
  },
) {
  console.log('[database.updateExecutionRecord] ========= 开始更新执行记录 =========');
  console.log('[database.updateExecutionRecord] executionId:', executionId);
  console.log('[database.updateExecutionRecord] updateData完整内容:');
  console.log(JSON.stringify(updateData, null, 2));

  const execution = await getExecutionByExecutionId(executionId);

  if (!execution) {
    console.error(`[database.updateExecutionRecord] 未找到执行记录: ${executionId}`);
    throw new Error(`Execution record not found: ${executionId}`);
  }

  console.log('[database.updateExecutionRecord] 找到执行记录，objectId:', execution.objectId);
  console.log('[database.updateExecutionRecord] 当前记录的buildId:', execution.buildId);
  console.log('[database.updateExecutionRecord] 准备更新buildId为:', updateData.buildId);

  const result = await storage
    .entity('AutomationExecutionRecord')
    .set(execution.objectId, updateData);
  console.log('[database.updateExecutionRecord] ========= storage.set完整返回结果 =========');
  console.log(JSON.stringify(result, null, 2));
  console.log('[database.updateExecutionRecord] ========= 返回结果分析 =========');
  console.log('[database.updateExecutionRecord] result类型:', typeof result);
  if (result && typeof result === 'object') {
    console.log('[database.updateExecutionRecord] result的所有key:', Object.keys(result));
  }
  console.log('[database.updateExecutionRecord] ==========================================');

  return result;
}

export async function getExecutionByExecutionId(executionId: string) {
  console.log('[database.getExecutionByExecutionId] ========= 开始查询 =========');
  console.log('[database.getExecutionByExecutionId] 查询executionId:', executionId);

  const result = await storage
    .entity('AutomationExecutionRecord')
    .query()
    .equalTo('executionId', executionId)
    .first();

  console.log('[database.getExecutionByExecutionId] ========= 查询完整结果 =========');
  console.log(JSON.stringify(result, null, 2));
  console.log('[database.getExecutionByExecutionId] ========= 结果分析 =========');
  console.log('[database.getExecutionByExecutionId] 是否找到记录:', result ? '是' : '否');
  if (result) {
    console.log('[database.getExecutionByExecutionId] result类型:', typeof result);
    console.log('[database.getExecutionByExecutionId] result的所有key:', Object.keys(result));
    console.log('[database.getExecutionByExecutionId] objectId:', result.objectId);
    console.log('[database.getExecutionByExecutionId] buildId:', result.buildId);
    console.log('[database.getExecutionByExecutionId] executionId:', result.executionId);
  }
  console.log('[database.getExecutionByExecutionId] ==========================================');

  return result;
}

export async function getExecutionByBuildId(buildId: string) {
  console.log('[database.getExecutionByBuildId] ========= 开始通过buildId查询 =========');
  console.log('[database.getExecutionByBuildId] 查询buildId:', buildId);

  const result = await storage
    .entity('AutomationExecutionRecord')
    .query()
    .equalTo('buildId', buildId)
    .first();

  console.log('[database.getExecutionByBuildId] ========= 查询完整结果 =========');
  console.log(JSON.stringify(result, null, 2));
  console.log('[database.getExecutionByBuildId] ========= 结果分析 =========');
  console.log('[database.getExecutionByBuildId] 是否找到记录:', result ? '是' : '否');
  if (result) {
    console.log('[database.getExecutionByBuildId] result类型:', typeof result);
    console.log('[database.getExecutionByBuildId] result的所有key:', Object.keys(result));
    console.log('[database.getExecutionByBuildId] objectId:', result.objectId);
    console.log('[database.getExecutionByBuildId] buildId:', result.buildId);
    console.log('[database.getExecutionByBuildId] executionId:', result.executionId);
  }
  console.log('[database.getExecutionByBuildId] ==========================================');

  return result;
}

// 获取测试用例映射关系
export async function getTestCaseMapping(executionId: string): Promise<Record<string, any> | null> {
  const execution = await getExecutionByExecutionId(executionId);
  if (!execution || !execution.testCaseMapping) {
    return null;
  }

  try {
    return JSON.parse(execution.testCaseMapping);
  } catch (error) {
    console.error('[database.getTestCaseMapping] 解析映射关系失败:', error);
    return null;
  }
}

// 通过buildId获取测试用例映射关系
export async function getTestCaseMappingByBuildId(
  buildId: string,
): Promise<Record<string, any> | null> {
  const execution = await getExecutionByBuildId(buildId);
  if (!execution || !execution.testCaseMapping) {
    return null;
  }

  try {
    return JSON.parse(execution.testCaseMapping);
  } catch (error) {
    console.error('[database.getTestCaseMappingByBuildId] 解析映射关系失败:', error);
    return null;
  }
}

export async function getExecutionsByWorkspace(
  workspaceKey: string,
  params?: {
    status?: string;
    limit?: number;
    offset?: number;
  },
) {
  const query = storage
    .entity('AutomationExecutionRecord')
    .query()
    .equalTo('workspaceKey', workspaceKey);

  if (params?.status) {
    query.equalTo('status', params.status);
  }

  query.descending('triggerTime');

  if (params?.limit) {
    query.limit(params.limit);
  }

  if (params?.offset) {
    query.skip(params.offset);
  }

  return await query.find();
}

// PipeCallbackQueue 数据库操作函数
export async function addToPipeCallbackQueue(data: {
  buildId: string;
  callbackData: string;
  status: string;
  retryCount?: number;
}) {
  const queueData: any = {
    buildId: data.buildId,
    callbackData: data.callbackData,
    status: data.status,
    retryCount: data.retryCount || 0,
  };

  // 尝试从执行记录中获取映射关系数据
  try {
    const execution = await getExecutionByBuildId(data.buildId);
    if (execution) {
      queueData.testCaseMapping = execution.testCaseMapping || null;
      queueData.testExecutionIds = execution.testExecutionIds || null;
    }
  } catch (error) {
    console.error('[addToPipeCallbackQueue] 获取执行记录失败:', error);
    // 不阻塞队列创建，继续执行
  }

  return await storage.entity('PipeCallbackQueue').add(queueData);
}

export async function getPendingPipeCallbacks(limit = 5) {
  return await storage
    .entity('PipeCallbackQueue')
    .query()
    .equalTo('status', 'pending')
    .lessThan('retryCount', 3)
    .ascending('createdAt')
    .limit(limit)
    .find();
}

export async function updatePipeCallbackStatus(
  queueId: string,
  status: string,
  processedTime?: Date,
) {
  const updateData: any = { status };
  if (processedTime) {
    updateData.processedTime = processedTime;
  }

  return await storage.entity('PipeCallbackQueue').set(queueId, updateData);
}

export async function incrementPipeCallbackRetryCount(queueId: string, currentRetryCount: number) {
  return await storage.entity('PipeCallbackQueue').set(queueId, {
    retryCount: currentRetryCount + 1,
    status: 'pending',
  });
}

export async function markPipeCallbackFailed(queueId: string) {
  return await storage.entity('PipeCallbackQueue').set(queueId, {
    status: 'failed',
    processedTime: new Date(),
  });
}
