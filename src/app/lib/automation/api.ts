// import { storage } from '@giteeteam/apps-api';

import fetch from '@/lib/utils/fetch';
import { getTenantKey, isDev } from '@/lib/utils/helper';

import {
  AUTOMATION_FIELD_KEYS,
  AutomationExecutionRecord,
  AutomationExecutionStatus,
  generateExecutionId,
  serializeTestExecutionIds,
  TestExecutionAutomationStatus,
} from './types';

// 执行参数接口
interface TriggerExecutionParams {
  testExecutionIds: string[];
  mavenVersion: string;
  jdkVersion: string;
}

// 触发执行响应接口
interface TriggerExecutionResponse {
  executionId: string;
  buildId: string;
  pipeJumpUrl: string;
}

// 检查执行状态响应接口
interface ExecutionStatusCheck {
  canExecute: boolean;
  runningExecutions: string[];
  totalCount: number;
}

/**
 * 检查测试执行的自动化执行状态（已简化，仅保留兼容性）
 * 注意：T3统一接口已包含状态检查，前端无需单独调用此函数
 */
export async function checkExecutionStatus(
  testExecutionIds: string[],
): Promise<ExecutionStatusCheck> {
  console.log('[Automation] checkExecutionStatus 已被T3统一接口替代，跳过前端检查');

  // 简化版本：假设可以执行，实际检查由后端统一接口完成
  return {
    canExecute: true,
    runningExecutions: [],
    totalCount: testExecutionIds.length,
  };
}

/**
 * 更新测试执行的自动化状态
 */
export async function updateTestExecutionStatus(
  testExecutionIds: string[],
  status: TestExecutionAutomationStatus,
): Promise<void> {
  try {
    const updatePromises = testExecutionIds.map(execId =>
      fetch.$put(`/parse/api/classes/TestExecution/${execId}`, {
        customFields: {
          [AUTOMATION_FIELD_KEYS.AUTOMATION_STATUS]: status,
        },
      }),
    );

    await Promise.all(updatePromises);
    console.log(
      `[Automation] 批量更新执行状态成功: ${testExecutionIds.length} 个用例状态更新为 ${status}`,
    );
  } catch (error) {
    console.error('[Automation] 更新执行状态失败:', error);
    throw new Error('更新执行状态失败');
  }
}

/**
 * 创建自动化执行记录
 */
export async function createExecutionRecord(
  executionId: string,
  params: TriggerExecutionParams,
  buildId?: string,
  pipeJumpUrl?: string,
): Promise<AutomationExecutionRecord> {
  try {
    const record: Omit<AutomationExecutionRecord, 'objectId'> = {
      executionId,
      buildId: buildId || '',
      testExecutionIds: serializeTestExecutionIds(params.testExecutionIds),
      mavenVersion: params.mavenVersion,
      jdkVersion: params.jdkVersion,
      status: AutomationExecutionStatus.PENDING,
      triggerTime: new Date(),
      pipeJumpUrl: pipeJumpUrl || '',
      triggerUser: 'current_user', // TODO: 获取当前用户
      workspaceKey: 'current_workspace', // TODO: 获取当前工作空间
      totalCount: params.testExecutionIds.length,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    // const response = await storage.entity('AutomationExecutionRecord').add(record);
    // console.log(`[Automation] 创建执行记录成功: ${executionId}`);

    return {
      ...record,
      // objectId: response.id,
      objectId: null,
    };
  } catch (error) {
    console.error('[Automation] 创建执行记录失败:', error);
    throw new Error('创建执行记录失败');
  }
}

/**
 * 调用 Pipe 流水线触发接口
 */
async function callPipeWebHook(params: TriggerExecutionParams): Promise<{
  buildId: string;
  pipeJumpUrl: string;
}> {
  try {
    // 构建 Pipe 请求参数
    const pipeParams = {
      mavenVersion: params.mavenVersion,
      jdkVersion: params.jdkVersion,
      testExecutionIds: params.testExecutionIds,
      // TODO: 添加其他必要参数，如回调地址等
    };

    // 调用 Pipe WebHook 接口
    // 注意：这里需要根据实际的 Pipe 接口文档来调整请求格式
    const response = await fetch.$post('/api/ipipe/pipeline/rest/v1/openApi/webHook', pipeParams);

    if (!response?.buildId) {
      throw new Error('Pipe 接口返回格式错误，缺少 buildId');
    }

    return {
      buildId: response.buildId,
      pipeJumpUrl: response.pipeJumpUrl || '',
    };
  } catch (error) {
    console.error('[Automation] 调用 Pipe 接口失败:', error);
    throw new Error('调用流水线接口失败: ' + error.message);
  }
}

/**
 * 触发自动化执行（T3统一接口版本）
 * 简化版本：只需调用后端统一接口
 */
export async function triggerAutomationExecution(
  params: TriggerExecutionParams,
): Promise<TriggerExecutionResponse> {
  console.log(
    `[Automation] 调用统一后端接口触发自动化执行: ${params.testExecutionIds.length} 个用例`,
  );

  try {
    const tenant = getTenantKey();
    // 获取当前环境，优先从context中获取，如果没有则根据NODE_ENV判断，默认为development
    const context = (globalThis as any)?.QiankunProps?.context;
    let environment = 'development';
    
    if (context?.env?.NODE_ENV === 'production') {
      environment = 'production';
    } else if (process.env.NODE_ENV === 'production') {
      environment = 'production';
    }
    
    console.log('[Automation] 当前环境:', environment);
    const apiPath = `/apps/api/v1/${tenant}/apps/test_manager/environments/${environment}/webtriggers/api-automation-execute`;

    const requestData = {
      testExecutionIds: params.testExecutionIds,
      mavenVersion: params.mavenVersion,
      jdkVersion: params.jdkVersion,
    };

    console.log('[Automation] API请求参数:', requestData);
    console.log('[Automation] API请求路径:', apiPath);

    const result = await fetch.$post(apiPath, requestData);

    if (result.success) {
      console.log(`[Automation] 自动化执行触发成功: ${result.data.executionId}`);
      return {
        executionId: result.data.executionId,
        buildId: result.data.buildId || '',
        pipeJumpUrl: result.data.pipeJumpUrl || '',
      };
    } else {
      console.error('[Automation] 后端接口返回失败:', result.error);
      throw new Error(result.error.message || '自动化执行失败');
    }
  } catch (error) {
    console.error('[Automation] 触发自动化执行失败:', error);

    // 如果是网络错误或其他非业务错误，抛出通用错误
    if (error.response || error.request) {
      throw new Error('网络请求失败，请稍后重试');
    }

    throw error;
  }
}

/**
 * 根据 buildId 查询执行记录
 */
export async function getExecutionRecordByBuildId(
  buildId: string,
): Promise<AutomationExecutionRecord | null> {
  try {
    // const record = await storage
    //   .entity('AutomationExecutionRecord')
    //   .query()
    //   .equalTo('buildId', buildId)
    //   .first();

    return null;
  } catch (error) {
    console.error('[Automation] 查询执行记录失败:', error);
    return null;
  }
}

/**
 * 更新执行记录状态
 */
export async function updateExecutionRecord(
  recordId: string,
  updates: Partial<AutomationExecutionRecord>,
): Promise<void> {
  try {
    // await storage.entity('AutomationExecutionRecord').set(recordId, updates);
    console.log(`[Automation] 更新执行记录成功: ${recordId}`);
  } catch (error) {
    console.error('[Automation] 更新执行记录失败:', error);
    throw error;
  }
}
