import React from 'react';
import { PROXIMA_EVENT_KEY, TEST_MANAGER_PLUGIN_KEY } from '@/lib/constants';
import { useListener } from '@projectproxima/proxima-sdk-js';

/** 监听事项创建成功 */
export const useOnItemCreateSuccess = cb => {
  const memoizedCallback = React.useCallback(
    params => {
      // 监听 key 为 TEST_MANAGER_PLUGIN_KEY 的事件
      if (params?.extraData?.key === TEST_MANAGER_PLUGIN_KEY) {
        cb(params);
      }
    },
    [cb],
  );
  useListener(PROXIMA_EVENT_KEY.itemSaveSuccess, memoizedCallback);
};
