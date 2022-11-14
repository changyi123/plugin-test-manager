import { Modal } from 'antd';
// import { Modal } from 'antd';
import { STORAGE_PREFIX_KEY } from '../constants';
import { isEqual, findKey, noop, startsWith } from 'lodash';
import createProximaSdk from '@projectproxima/proxima-sdk-js';

/**
 * 获取 team api 地址
 * 兼容处理：spa 改造后 env 变量上无 PROXIMA_GATEWAY 配置，优先从 QiankunProps 中取
 */
const getProximaGateWay = () => {
  return (
    window?.QiankunProps?.context?.env?.PROXIMA_GATEWAY ??
    window?.env?.PROXIMA_GATEWAY ??
    process?.env?.PROXIMA_GATEWAY
  );
};

/** 获取租户信息 */
export const getTenantKey = () => {
  // dev 环境默认取 env 中的 PROXIMA_APP_ID
  return (window as any)?.env?.PROXIMA_APP_ID ?? process.env.PROXIMA_APP_ID ?? 'osc';
};
/** 获取 proxima baseUrl */
export const getProximaBasePath = () => {
  // FIXME: 确认 spa 环境改造后 接口前缀 和 页面前缀有没有不一致的情况？
  // 目前暂时先保留该方法，后续需要单独的判断
  return '/project';
};

// /** 获取接口前缀 */
// export const getApiPrefix = () => {};

// /** 获取前端跳转前缀 */
// export const getPagePrefix = () => {};

// 获取 webTrigger 前缀
export const getPluginWebTriggerBaseUrl = () => {
  // 集成环境需要先判断前缀
  const ApiPrefix = isInOne() ? getProximaBasePath() : '';
  return `/api${ApiPrefix}/app/${getTenantKey()}/test_manager/webhooks`;
};

export const hasArrayItem = (arr?: unknown[]) => Boolean(Array.isArray(arr) && arr.length);

export const getRootContainer = () =>
  (document.querySelector('#osc-proxima') ??
    document.querySelector('#test-manager')) as HTMLElement;

export const getKeyByValue = (object: Record<string, unknown>, value: unknown) =>
  findKey(object, val => isEqual(val, value));

/** 转换 pointer */
export const pointerTransfer = (parseModel, pointer: any) => {
  return typeof pointer === 'string' ? parseModel.createWithoutData(pointer) : pointer;
};

/** 处理 Parse.Query.matches 参数，避免 postgreSQL 正则查询错误 */
export const escapeMatchesQueryArg = (_str: unknown, flags?: RegExp['flags'][]): RegExp => {
  // 对正则关键特殊字符进行转义
  const str = _str?.toString() ?? '';
  return new RegExp(str.trim().replace(/[!$()*+.:?=[\]^{|}]/g, '\\$&'), flags?.join('') ?? '');
};

/** 转换成数组 */
export const toArray = data => (Array.isArray(data) ? data : [data]);

/** 确认下一步 */
export const actionConfirm = (content: string, cb = noop) => {
  return new Promise(resolve => {
    Modal.confirm({
      content,
      onOk: () => {
        cb();
        resolve(true);
      },
      width: 500,
      title: '提示',
      okText: '继续',
      getContainer: getRootContainer,
    });
  });
};

/** 生成本地存储的 key */
export const generateStorageKey = (...args: string[]) => {
  return `${STORAGE_PREFIX_KEY}-${args.filter(Boolean).join('-')}`;
};

/** 生成跳转 URL */
export const goToItemDetailPage = ({ workspaceKey, itemKey }) => {
  return window.open(
    `${getProximaBasePath()}/${getTenantKey()}/workspaces/${workspaceKey}/item/${itemKey}`,
    '_blank',
  );
};

/** 打开测试详情弹窗 */
export const openItemViewScreen = itemId => {
  if (!itemId) return;
  const proximaSDK = createProximaSdk();
  proximaSDK.execute('openItemViewScreen', itemId);
};

/** 编码 html 字符串 */
export const escapeHtmlString = str => {
  return str?.replace(/&\w+;/g, c => {
    return { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"' }[c] ?? c;
  });
};

/** 申城排序索引 */
export const generateSortIndex = (index = 0) => {
  return Math.floor(Date.now() / 1000) * 10e5 + index;
};

/** 生成静态资源文件地址 */
export const generateStaticFileUrl = (url: string) => {
  const isFullUrl = /^(https?:)?\/\//.test(url);
  if (isFullUrl) return url;
  return `${/^\/project\//.test(url) ? '' : getProximaBasePath()}${url}`;
};

/** 插件版本输出 */
export const logPluginVersion = () => {
  // eslint-disable-next-line no-console
  console.log('%cPLUGIN-VERSION:', 'font-size: 16px; font-weight: 700; color: skyblue');
  // eslint-disable-next-line no-console
  console.table({
    Branch: (process.env as any)?.PROXIMA_VERSION_BRANCH,
    Commit: (process.env as any)?.PROXIMA_VERSION_COMMIT,
  });
};

export const inIframe = (): boolean => {
  const isServer = (): boolean => typeof window === 'undefined';
  const inServer = isServer();

  if (inServer) return false;
  try {
    return window.self !== window.top;
  } catch (e) {
    console.info('inIframe', e);
    return true;
  }
};

export const isInOne = () => {
  const isServer = (): boolean => typeof window === 'undefined';
  const inServer = isServer();

  if (inServer) return false;
  try {
    const gateway = getProximaGateWay();
    console.log('gateway--------->', gateway, startsWith(new URL(gateway).pathname, '/api'));
    return startsWith(new URL(gateway).pathname, '/api');
  } catch (e) {
    console.info('isInOne', e);
    return true;
  }
};

/** panel 消息通知 */
export { alert } from '@/components/business/PanelLayout';
