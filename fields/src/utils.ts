import { startsWith } from 'lodash';
/** 获取租户信息 */
export const getTenantKey = () => {
  // dev 环境默认取 env 中的 PROXIMA_APP_ID
  return window?.env?.PROXIMA_APP_ID ?? process.env.PROXIMA_APP_ID ?? 'osc';
};

export const isInOne = (): boolean => {
  const isServer = (): boolean => typeof window === 'undefined';
  const inServer = isServer();

  if (inServer) return false;
  try {
    const gateway = (window as any).env.PROXIMA_GATEWAY;
    return startsWith(new URL(gateway).pathname, '/api');
  } catch (e) {
    console.info('isInOne', e);
    return true;
  }
};

/** 获取 proxima baseUrl */
export const getProximaBasePath = () => {
  // 目前暂时先保留该方法，后续需要单独的判断
  return '/project';
};

// 获取 webTrigger 前缀
export const getPluginWebTriggerBaseUrl = () => {
  // 集成环境需要先判断前缀
  const ApiPrefix = isInOne() ? getProximaBasePath() : '';
  return `/api${ApiPrefix}/app/${getTenantKey()}/test_manager/webhooks`;
};
