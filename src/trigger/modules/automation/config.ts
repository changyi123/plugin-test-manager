/**
 * 自动化测试同步系统配置
 * 动态获取环境信息，避免硬编码
 */

/**
 * 获取代码平台配置
 * 优先级：环境变量 > 全局变量 > 默认值
 */
export function getCodePlatformConfig() {
  // 从全局变量获取（触发器运行时会注入）
  const globalData = global as any;
  // 调试：打印可用的信息
  console.log('[AutoSync] [DEBUG] global.applicationId:', globalData.applicationId);
  console.log('[AutoSync] [DEBUG] global.headers:', globalData.headers ? 'exists' : 'undefined');

  // 重点关注env中的域名相关配置
  const envKeys = Object.keys(globalData.env || {});
  console.log('[AutoSync] [DEBUG] global.env keys count:', envKeys.length);

  // 查找可能的域名相关配置
  const domainRelatedKeys = envKeys.filter(
    key =>
      key.toLowerCase().includes('domain') ||
      key.toLowerCase().includes('host') ||
      key.toLowerCase().includes('url') ||
      key.toLowerCase().includes('git'),
  );
  console.log('[AutoSync] [DEBUG] domain related env keys:', domainRelatedKeys);

  // 打印这些键的值
  domainRelatedKeys.forEach(key => {
    console.log(`[AutoSync] [DEBUG] global.env.${key}:`, globalData.env[key]);
  });

  // 获取企业/租户标识 - 使用项目标准方式
  const enterprise =
    globalData.applicationId || // 全局变量（项目标准方式）
    globalData.headers?.['x-proxima-tenant'] || // 请求头
    'osc'; // 默认值

  // 获取域名 - 优先从环境变量获取
  const domain = globalData.env?.AUTOMATION_CODE_PLATFORM_DOMAIN;

  // 获取私有令牌 - 优先从环境变量获取
  const privateToken = globalData.env?.AUTOMATION_CODE_PLATFORM_TOKEN;

  // 构建基础URL
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

  console.log(`[AutoSync] 代码平台配置: domain=${domain}, enterprise=${enterprise}`);

  return {
    domain,
    enterprise,
    privateToken,
    baseUrl,
    apiBaseUrl: `${baseUrl}/api/v8`,
  };
}

/**
 * 获取工作空间配置
 * 从全局变量或webhook数据中获取
 */
export function getWorkspaceConfig() {
  const globalData = global as any;

  // 从不同来源获取工作空间key
  const workspaceKey =
    globalData.workspace?.key || // 直接的工作空间对象
    globalData.body?.workspaceKey || // 请求体
    globalData.headers?.['x-proxima-workspacekey'] || // 请求头
    globalData.triggerParams?.workspaceKey || // 触发参数
    '';

  // 获取工作空间ID
  const workspaceId = globalData.workspace?.objectId || globalData.workspace?.id || '';

  console.log(`[AutoSync] 工作空间配置: workspaceKey=${workspaceKey}`);

  return {
    workspaceKey,
    workspaceId,
  };
}

/**
 * 获取完整的运行时配置
 */
export function getRuntimeConfig() {
  const codePlatform = getCodePlatformConfig();
  const workspace = getWorkspaceConfig();

  return {
    codePlatform,
    workspace,
    // 其他配置项
    syncBranch: (global as any).env?.SYNC_BRANCH || 'master',
    batchSize: parseInt((global as any).env?.BATCH_SIZE || '5'),
    enableDebugLog: (global as any).env?.DEBUG === 'true',
  };
}
