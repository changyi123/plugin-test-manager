import { Modal } from '@osui/ui';
import { isEqual, findKey, noop } from 'lodash';
import { STORAGE_PREFIX_KEY } from '../constants';
import createProximaSdk from '@projectproxima/proxima-sdk-js';

/** 获取租户信息 */
export const getTenantKey = (defaultValue?: string) => {
  return (window as any)?.env?.PROXIMA_APP_ID ?? defaultValue ?? 'osc';
};
/** 获取 proxima baseUrl */
export const getProximaBasePath = () => {
  return /^\/project\//.test(window.location.pathname) ? '/project/' : '';
};

export const hasArrayItem = (arr?: unknown[]) => Boolean(Array.isArray(arr) && arr.length);

export const getRootContainer = () =>
  (document.getElementById('osc-proxima') ||
    document.querySelector('#test-manager')) as HTMLElement;

export const getKeyByValue = (object: Record<string, unknown>, value: unknown) =>
  findKey(object, val => isEqual(val, value));

/** 转换 pointer */
export const pointerTransfer = (parseModel, pointer: PointerType) => {
  return typeof pointer === 'string' ? parseModel.createWithoutData(pointer) : pointer;
};

/** 处理 Parse.Query.matches 参数，避免 postgreSQL 正则查询错误 */
export const escapeMatchesQueryArg = (_str: unknown): RegExp => {
  // 对正则关键特殊字符进行转义
  const str = _str?.toString() ?? '';
  return new RegExp(str.trim().replace(/[!$()*+.:?=[\]^{|}]/g, '\\$&'));
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
    `${getProximaBasePath()}/${getTenantKey('osc')}/workspaces/${workspaceKey}/item/${itemKey}`,
    '_blank',
  );
};

/** 打开测试详情弹窗 */
export const openItemViewScreen = itemId => {
  if (!itemId) return;
  const proximaSDK = createProximaSdk();
  proximaSDK.execute('openItemViewScreen', itemId);
};

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
  // 对数据进行兼容
  const isStartWithProjectPath = /^\/project/.test(url);
  return `${!isStartWithProjectPath ? getProximaBasePath() : ''}${url}`;
};

/** panel 消息通知 */
export { alert } from '@/components/business/PanelLayout';
