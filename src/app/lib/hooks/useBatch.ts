import { useCallback } from 'react';

import { fetchBatchProgress, fetchBatchResult } from '../api/item';

const sleep = time => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(undefined);
    }, time);
  });
};

export function useBatch() {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = {} as any;
  // 循环获取当前执行进度
  const start = useCallback(
    async batchId => {
      let progress = 0;
      while (progress < 100) {
        const { success, fail, count } = await fetchBatchProgress(batchId);
        progress = ((success + fail) / count) * 100;
        fn.updateProgress?.(progress);
        await sleep(2000);
      }
      const res = await fetchBatchResult(batchId);
      fn.over?.(res);
    },
    [fn],
  );

  // 注册进度条更新函数
  const listenProgress = useCallback(
    f => {
      fn.updateProgress = f;
    },
    [fn],
  );

  // 注册完成函数
  const listenOver = useCallback(
    f => {
      fn.over = f;
    },
    [fn],
  );

  return {
    start,
    listenProgress,
    listenOver,
  };
}
