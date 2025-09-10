import { buildResponse } from '../../lib/apiUtil';
import { addToPipeCallbackQueue } from './database';

// Pipe回调参数接口
export interface PipeCallbackParams {
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
 * Pipe自动化执行回调接收接口
 * 轻量级接口，先保存再说，避免消息丢失
 */
export const pipeAutomationCallback = async (params: any): Promise<any> => {
  console.log('[pipeAutomationCallback] 收到Pipe回调请求:', JSON.stringify(params));

  try {
    // 从params.payload中获取回调数据
    const callbackData = params.payload as PipeCallbackParams;
    console.log('[pipeAutomationCallback] 解析回调数据:', callbackData);

    // 宽松处理：先保存，避免消息丢失
    const buildId = callbackData.buildId || 'unknown_' + Date.now();

    console.log(`[pipeAutomationCallback] 准备入队，buildId: ${buildId}`);

    // 将回调数据存储到队列中，由队列处理器异步消费
    const queueId = await addToPipeCallbackQueue({
      buildId: buildId,
      callbackData: JSON.stringify(callbackData),
      status: 'pending',
    });

    console.log(`[pipeAutomationCallback] 回调数据已入队，queueId: ${queueId}`);

    // 快速响应，告知Pipe平台已接收
    return buildResponse({
      success: true,
      code: 200,
      data: {
        queueId,
        buildId: buildId,
        status: 'queued',
        message: `Pipe回调已接收并排队处理`,
      },
    });
  } catch (error) {
    console.error('[pipeAutomationCallback] Pipe回调接收失败:', error);

    // 即使出错也尽量返回成功，避免第三方重复调用
    return buildResponse({
      success: true,
      code: 200,
      data: {
        message: 'Callback received, will be processed later',
      },
    });
  }
};

/**
 * 重试机制的Pipe回调处理
 * 如果主回调失败，可以通过此接口进行重试
 */
export const pipeAutomationCallbackRetry = async (params: any): Promise<any> => {
  console.log('[pipeAutomationCallbackRetry] 收到Pipe回调重试请求');

  // 重试逻辑与主回调相同，但会记录重试标识
  const result = await pipeAutomationCallback(params);

  // 在响应中添加重试标识
  if (result.data) {
    result.data.isRetry = true;
  }

  return result;
};
