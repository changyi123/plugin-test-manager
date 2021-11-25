export const hasArrayItem = (arr?: unknown[]) => Boolean(Array.isArray(arr) && arr.length);

export const getRootContainer = () => document.querySelector('#test-manager') as HTMLElement;
