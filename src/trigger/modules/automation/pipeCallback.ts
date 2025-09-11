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
 * 从请求参数中提取回调数据
 * 处理各种可能的数据格式
 */
function extractCallbackDataFromParams(params: any): PipeCallbackParams {
  console.log(`[PipeCallback] extractCallbackDataFromParams 开始提取数据`);
  
  // 尝试直接从params中提取字段
  const directExtract: PipeCallbackParams = {
    buildId: params.buildId || params['buildId'],
    status: params.status || params['status'] || 'completed',
    pipeJmpUrl: params.pipeJmpUrl || params['pipeJmpUrl'],
    pipeLogFile: params.pipeLogFile || params['pipeLogFile'],
    reportFile: params.reportFile || params['reportFile'],
    reportLogFile: params.reportLogFile || params['reportLogFile'],
    startTime: params.startTime || params['startTime'],
    endTime: params.endTime || params['endTime'],
    logFile: params.logFile || params['logFile'],
    jumpUrl: params.jumpUrl || params['jumpUrl'],
  };
  
  // 如果直接提取成功
  if (directExtract.buildId) {
    console.log('[PipeCallback] 直接提取成功');
    return directExtract;
  }
  
  // 尝试从params.payload中提取（如果存在）
  if (params.payload) {
    const payload = params.payload;
    
    // 如果payload是对象，遍历所有key尝试解析
    if (typeof payload === 'object') {
      // 特殊处理：当JSON数据作为key传递时（form-urlencoded格式导致）
      // 尝试合并所有看起来像JSON片段的key
      const jsonKeys = Object.keys(payload).filter(key => 
        key.includes('"buildId"') || key.includes('"status"') || key.includes('"pipeJmpUrl"')
      );
      
      if (jsonKeys.length > 0) {
        // 尝试重建完整的JSON字符串
        // 由于form-urlencoded会将JSON分割，我们需要重新组合
        let fullJsonStr = '';
        for (const key of jsonKeys) {
          fullJsonStr += key;
          // 如果有对应的value且不是标准的表单值，也加上
          const value = payload[key];
          if (value && typeof value === 'string' && value !== '' && value !== 'undefined') {
            fullJsonStr += '=' + value;
          }
        }
        
        console.log('[PipeCallback] 尝试重建JSON字符串，长度:', fullJsonStr.length);
        console.log('[PipeCallback] 重建的JSON前200字符:', fullJsonStr.substring(0, 200));
        
        // 尝试提取JSON对象（即使字符串不完整）
        try {
          // 尝试找到JSON的开始和可能的结束
          const jsonStart = fullJsonStr.indexOf('{');
          if (jsonStart >= 0) {
            let jsonStr = fullJsonStr.substring(jsonStart);
            
            // 尝试修复截断的JSON
            // 计算需要的闭合括号数量
            let openBraces = 0;
            let closeBraces = 0;
            for (const char of jsonStr) {
              if (char === '{') openBraces++;
              if (char === '}') closeBraces++;
            }
            
            // 补充缺失的闭合括号
            while (closeBraces < openBraces) {
              jsonStr += '}';
              closeBraces++;
            }
            
            // 尝试解析修复后的JSON
            const parsed = JSON.parse(jsonStr);
            if (parsed.buildId) {
              console.log('[PipeCallback] 成功从重建的JSON中解析数据');
              return {
                buildId: String(parsed.buildId),
                status: parsed.status || 'completed',
                pipeJmpUrl: parsed.pipeJmpUrl || parsed.pipeJumpUrl,
                pipeLogFile: parsed.pipeLogFile,
                reportFile: parsed.reportFile,
                reportLogFile: parsed.reportLogFile,
                startTime: parsed.startTime,
                endTime: parsed.endTime,
                logFile: parsed.logFile,
                jumpUrl: parsed.jumpUrl || parsed.pipeJmpUrl,
              };
            }
          }
        } catch (e) {
          console.error('[PipeCallback] 解析重建的JSON失败:', e);
          
          // 尝试使用正则表达式提取关键字段
          try {
            const buildIdMatch = fullJsonStr.match(/"buildId"\s*:\s*(\d+)/);
            const statusMatch = fullJsonStr.match(/"status"\s*:\s*"([^"]+)"/);
            const pipeJmpUrlMatch = fullJsonStr.match(/"pipeJmpUrl"\s*:\s*"([^"]+)"/);
            const reportFileMatch = fullJsonStr.match(/"reportFile"\s*:\s*"([^"]+)"/);
            const pipeLogFileMatch = fullJsonStr.match(/"pipeLogFile"\s*:\s*"([^"]+)"/);
            const reportLogFileMatch = fullJsonStr.match(/"reportLogFile"\s*:\s*"([^"]+)"/);
            
            if (buildIdMatch) {
              console.log('[PipeCallback] 使用正则表达式提取成功');
              return {
                buildId: buildIdMatch[1],
                status: (statusMatch?.[1] || 'completed') as any,
                pipeJmpUrl: pipeJmpUrlMatch?.[1],
                pipeLogFile: pipeLogFileMatch?.[1],
                reportFile: reportFileMatch?.[1],
                reportLogFile: reportLogFileMatch?.[1],
              };
            }
          } catch (regexError) {
            console.error('[PipeCallback] 正则提取失败:', regexError);
          }
        }
      }
      
      // 原有的逻辑：遍历所有key尝试解析
      for (const key of Object.keys(payload)) {
        // 跳过已知的非数据字段
        if (key === 'env' || key === 'headers' || key === 'language' || key === 'extraParams') {
          continue;
        }
        
        // 如果value看起来像回调数据
        const value = payload[key];
        if (value && typeof value === 'object' && value.buildId) {
          console.log('[PipeCallback] 从payload value中找到回调数据');
          return value;
        }
      }
    }
  }
  
  console.warn('[PipeCallback] 无法提取有效的回调数据，返回默认值');
  // 返回一个带有错误标记的默认值
  return {
    buildId: 'parse_error_' + Date.now(),
    status: 'failed',
    errorMessage: 'Failed to parse callback data',
  } as any;
}

/**
 * Pipe自动化执行回调接收接口
 * 轻量级接口，先保存再说，避免消息丢失
 */
export const pipeAutomationCallback = async (params: any): Promise<any> => {
  console.log('[PipeCallback] === 收到Pipe回调请求 ===');
  console.log('[PipeCallback] 原始params:', JSON.stringify(params, null, 2));
  console.log('[PipeCallback] params类型:', typeof params);
  console.log('[PipeCallback] params.payload存在:', !!params.payload);

  try {
    // 尝试多种方式解析回调数据
    let callbackData: PipeCallbackParams;
    
    // 方式1: 如果params.payload是字符串，尝试解析
    if (typeof params.payload === 'string') {
      console.log('[PipeCallback] payload是字符串，尝试JSON解析');
      try {
        callbackData = JSON.parse(params.payload);
      } catch (e) {
        console.error('[PipeCallback] JSON解析失败:', e);
        // 如果解析失败，可能是form-urlencoded格式，尝试从params中提取
        callbackData = extractCallbackDataFromParams(params);
      }
    } 
    // 方式2: 如果params.payload是对象，检查是否包含实际数据
    else if (typeof params.payload === 'object' && params.payload !== null) {
      console.log('[PipeCallback] payload是对象，检查结构');
      
      // 检查Content-Type，判断是否是错误的form-urlencoded格式
      const contentType = params.payload.headers?.['content-type'] || '';
      const isFormEncoded = contentType.includes('application/x-www-form-urlencoded');
      
      if (isFormEncoded) {
        console.warn('[PipeCallback] ⚠️ 检测到错误的Content-Type: application/x-www-form-urlencoded');
        console.warn('[PipeCallback] ⚠️ Pipe平台应该使用 application/json 格式发送数据');
      }
      
      // 首先检查payload中是否直接包含buildId等回调数据字段
      if (params.payload.buildId) {
        console.log('[PipeCallback] payload直接包含回调数据');
        callbackData = {
          buildId: String(params.payload.buildId),
          status: params.payload.status || 'completed',
          pipeJmpUrl: params.payload.pipeJmpUrl,
          pipeLogFile: params.payload.pipeLogFile,
          reportFile: params.payload.reportFile,
          reportLogFile: params.payload.reportLogFile,
          startTime: params.payload.startTime,
          endTime: params.payload.endTime,
          logFile: params.payload.logFile,
          jumpUrl: params.payload.jumpUrl || params.payload.pipeJmpUrl,
        };
      }
      // 如果payload同时包含env/headers但没有buildId，可能是被包装的数据
      else if (params.payload.env && params.payload.headers) {
        console.log('[PipeCallback] 检测到env/headers包装，尝试提取实际数据');
        // 尝试从对象的key中找到JSON字符串
        const jsonKey = Object.keys(params.payload).find(key => key.startsWith('{'));
        if (jsonKey) {
          console.log('[PipeCallback] 找到JSON key，尝试解析');
          console.log('[PipeCallback] JSON key 前100字符:', jsonKey.substring(0, 100));
          try {
            // 先尝试直接解析
            callbackData = JSON.parse(jsonKey);
          } catch (e) {
            console.error('[PipeCallback] 直接解析失败，尝试修复并提取');
            // 使用增强的提取函数
            callbackData = extractCallbackDataFromParams(params);
          }
        } else {
          callbackData = extractCallbackDataFromParams(params);
        }
      } else {
        // 其他情况，使用通用提取函数
        callbackData = extractCallbackDataFromParams(params);
      }
    }
    // 方式3: 直接从params中提取
    else {
      console.log('[PipeCallback] 从params中直接提取数据');
      callbackData = extractCallbackDataFromParams(params);
    }
    
    console.log('[PipeCallback] 解析后的回调数据:', JSON.stringify(callbackData, null, 2));
    console.log('[PipeCallback] 回调数据关键字段检查:');
    console.log('[PipeCallback] - buildId:', callbackData?.buildId);
    console.log('[PipeCallback] - status:', callbackData?.status);
    console.log('[PipeCallback] - pipeJmpUrl:', callbackData?.pipeJmpUrl);
    console.log('[PipeCallback] - reportFile:', callbackData?.reportFile);

    // 宽松处理：先保存，避免消息丢失
    const buildId = callbackData.buildId || 'unknown_' + Date.now();

    console.log(`[PipeCallback] 准备入队处理，buildId: ${buildId}`);

    // 将回调数据存储到队列中，由队列处理器异步消费
    const queueData = {
      buildId: buildId,
      callbackData: JSON.stringify(callbackData),
      status: 'pending',
    };
    console.log('[PipeCallback] 入队数据:', queueData);

    const queueId = await addToPipeCallbackQueue(queueData);

    console.log(`[PipeCallback] 回调数据已成功入队，queueId: ${queueId}`);

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
    console.error('[PipeCallback] === Pipe回调接收失败 ===');
    console.error('[PipeCallback] 错误详情:', error);
    console.error('[PipeCallback] 错误消息:', error?.message);
    console.error('[PipeCallback] 错误堆栈:', error?.stack);
    console.error('[PipeCallback] 原始请求数据:', JSON.stringify(params, null, 2));

    // 即使出错也尽量返回成功，避免第三方重复调用
    return buildResponse({
      success: true,
      code: 200,
      data: {
        message: 'Callback received, will be processed later',
        error: error?.message,
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
