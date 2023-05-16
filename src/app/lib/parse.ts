import { getDevConfig, getParseReqHeader } from '@/devEnv';
import { getTenantKey } from '@/lib/utils/helper';
let Parse;

if (process.env.NODE_ENV === 'production' || window.__POWERED_BY_QIANKUN__) {
  // TODO: 添加 log
  console.info('QiankunProps', window.QiankunProps, window);
  Parse = window.QiankunProps?.Parse;
} else {
  const { baseURL, env } = getDevConfig();
  Parse = typeof window === 'undefined' ? require('parse/node') : require('parse');
  // dev 环境使用默认的 env PROXIMA_APP_ID
  const PROXIMA_APP_ID = getTenantKey();
  // 和 one 集成环境需要添加 header
  if (env === 'one') {
    Parse?.CoreManager?.set('REQUEST_HEADERS', getParseReqHeader());
  }
  Parse.serverURL = `${baseURL}/parse`;
  Parse.initialize(PROXIMA_APP_ID);
}

export default Parse;
