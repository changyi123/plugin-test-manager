import { isEqual, findKey } from 'lodash';

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

/** 转换成数组 */
export const toArray = data => (Array.isArray(data) ? data : [data]);

/** panel 消息通知 */
export { alert } from '@/components/panel/PanelLayout';
