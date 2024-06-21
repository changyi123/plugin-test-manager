import Storage from 'proxima-sdk/lib/Storage';
import { useCallback, useEffect, useState } from 'react';
import type { ColumnShape } from 'react-base-table';

import { cacheColumnWidthInterface } from '../type';

export interface resizeInterface {
  column: ColumnShape;
  width: number;
}

export interface returnInterface {
  cacheColumnWidth: cacheColumnWidthInterface;
  setCacheColumnWidth: (cacheColumnWidth) => void;
  columnResizeEnd: (value: resizeInterface) => void;
  updateColumnWidth: (groupId: string, chartKey: string) => void;
}

// 本地用来存储的 key，在 app 项目下的 global.ts 有同一个 key
const CHART_COLUMN_WIDTH_KEY = 'local-report-storage';

const { getItem, setItem } = Storage;

const useCacheColumns = (chartGroupId: string, chartId: string): returnInterface => {
  const [cacheColumnWidth, setCacheColumnWidth] = useState(() => {
    const cached = getItem(CHART_COLUMN_WIDTH_KEY);
    return cached?.[chartGroupId]?.[chartId] || {};
  });

  /**
   * @description 更新组件列宽
   * @param  {string} groupId 仪表盘 id
   * @param  {string} chartKey 图表 id
   */
  const updateColumnWidth = useCallback((groupId: string, chartKey: string) => {
    const getCacheColumnWidth = getItem(CHART_COLUMN_WIDTH_KEY) || {};
    const currentWidth = getCacheColumnWidth[groupId][chartKey];
    setCacheColumnWidth(currentWidth);
  }, []);

  // 更新 local 列宽
  useEffect(() => {
    const getCacheColumnWidth = getItem(CHART_COLUMN_WIDTH_KEY) || {};

    !getCacheColumnWidth?.[chartGroupId] && (getCacheColumnWidth[chartGroupId] = {});
    getCacheColumnWidth[chartGroupId][chartId] = cacheColumnWidth;
    setItem(CHART_COLUMN_WIDTH_KEY, getCacheColumnWidth);
  }, [cacheColumnWidth, chartGroupId]);

  // resize 回调，更新组件状态触发上面 effect 来更新 local
  const columnResizeEnd = useCallback(
    ({ column, width }) => {
      const data = {
        ...cacheColumnWidth,
        [column?.key]: width,
      };
      setCacheColumnWidth(data);
    },
    [cacheColumnWidth],
  );

  return {
    cacheColumnWidth,
    setCacheColumnWidth,
    columnResizeEnd,
    updateColumnWidth,
  };
};
export default useCacheColumns;
