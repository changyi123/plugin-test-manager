import { isEqual, findKey } from 'lodash';

export const hasArrayItem = (arr?: unknown[]) => Boolean(Array.isArray(arr) && arr.length);

export const getRootContainer = () => document.querySelector('#test-manager') as HTMLElement;

export const getKeyByValue = (object: Record<string, unknown>, value: unknown) =>
  findKey(object, val => isEqual(val, value));
