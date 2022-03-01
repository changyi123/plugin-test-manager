import { Modal } from '@osui/ui';
import { isEqual, findKey, noop } from 'lodash';

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

/** panel 消息通知 */
export { alert } from '@/components/panel/PanelLayout';
