import React from 'react';
import { generateStorageKey } from '@/lib/utils/helper';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { PROXIMA_EVENT_KEY, TEST_MANAGER_PLUGIN_KEY } from '@/lib/constants';

// 增加判重机制，防止重复回调被重复触发
const storageKey = generateStorageKey('previousCreateSuccessParamItemId');

/** 监听事项创建成功 */
export const useOnItemCreateSuccess = cb => {
  const memoizedCallback = React.useCallback(
    params => {
      const previousCreateSuccessParamItemId = sessionStorage.getItem(storageKey);
      // 监听 key 为 TEST_MANAGER_PLUGIN_KEY 的事件
      if (
        params?.extraData?.key === TEST_MANAGER_PLUGIN_KEY &&
        previousCreateSuccessParamItemId !== params.itemId
      ) {
        sessionStorage.setItem(storageKey, params.itemId);
        cb(params);
      }
    },
    [cb],
  );
  useListener(PROXIMA_EVENT_KEY.itemSaveSuccess, memoizedCallback);
};
