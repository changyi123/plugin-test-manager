import React from 'react';
import { generateStorageKey } from '@/lib/utils/helper';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { PROXIMA_EVENT_KEY, TEST_MANAGER_PLUGIN_KEY } from '@/lib/constants';

const callbackMap = new Map();

// 增加判重机制，防止重复回调被重复触发
const previousMessageToken = {
  _storageKey: generateStorageKey('previousCreateSuccessMessageToken'),
  get() {
    return sessionStorage.getItem(previousMessageToken._storageKey);
  },
  set(value) {
    sessionStorage.setItem(previousMessageToken._storageKey, value);
  },
};

/** 监听事项创建成功 */
export const useOnItemCreateSuccess = (key, saveCallback, batchCreateCallback) => {
  callbackMap.set(key, [saveCallback, batchCreateCallback]);
  const memoizedItemSaveCallback = React.useCallback(params => {
    const getMessageToken = params => params?.extraData?.messageKey + params?.itemId;
    const messageToken = getMessageToken(params);
    const [callback] = callbackMap.get(params?.extraData?.messageKey);

    // 监听 key 为 TEST_MANAGER_PLUGIN_KEY 的事件
    if (
      callback &&
      messageToken !== previousMessageToken.get() &&
      params?.extraData?.key === TEST_MANAGER_PLUGIN_KEY
    ) {
      previousMessageToken.set(messageToken);
      callback(params);
    }
  }, []);

  const memoizedItemBatchCreateCallback = React.useCallback(params => {
    const getMessageToken = params =>
      params?.extraData?.messageKey + params?.itemIdList?.toString();

    const messageToken = getMessageToken(params);
    const [, callback] = callbackMap.get(params?.extraData?.messageKey);

    if (
      callback &&
      messageToken !== previousMessageToken.get() &&
      params?.extraData?.key === TEST_MANAGER_PLUGIN_KEY
    ) {
      previousMessageToken.set(messageToken);
      callback(params);
    }
  }, []);

  useListener(PROXIMA_EVENT_KEY.itemSaveSuccess, memoizedItemSaveCallback);
  useListener(PROXIMA_EVENT_KEY.itemBatchCreateSuccess, memoizedItemBatchCreateCallback);
};
