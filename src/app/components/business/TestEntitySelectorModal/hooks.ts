import { useState } from 'react';
import { traverseTreeNodes } from '@/pages/repository/util';
import { clone, sum } from 'lodash';
import { useDeepCompareEffect } from 'ahooks';

interface VirtualScrollList {
  groups: Record<string, any>;
  items: Record<string, any>[];
  groupCounts: number[];
  totalCount: number;
  groupArray: Map<string, Record<string, any>>;
}

export const useGetVirtualScrollList = (
  group,
  caseListMap,
  allCaseIds?: string[],
  current?: number,
): VirtualScrollList => {
  const [groupMap, setGroupMap] = useState<Map<string, Record<string, any>>>(new Map());
  const [groupArray, setGroupArray] = useState<Map<string, Record<string, any>>>(new Map());
  const [groupCounts, setGroupCounts] = useState<number[]>([]);

  useDeepCompareEffect(() => {
    if (group?.length) {
      const map = new Map();
      const mapArray = new Map();
      const itemIds = clone(allCaseIds);
      let counts = [];
      traverseTreeNodes(group, node => {
        mapArray.set(node.key, node);
        if (node?.counts[0]) {
          map.set(node.key, {
            ...node,
            isGroup: true,
            nodeCaseIdsSet: new Set(itemIds?.splice(0, node?.counts[0]) ?? []),
          });
          const sumCounts = sum(counts);
          const currentNum = current * 100;
          if (sumCounts < currentNum) {
            counts = counts.concat(
              sumCounts + node.counts[0] <= currentNum ? node.counts[0] : currentNum - sumCounts,
            );
          }
        }
      });
      setGroupMap(map);
      setGroupArray(mapArray);
      setGroupCounts(counts);
    }
  }, [group, allCaseIds, current]);

  return {
    groupArray,
    items: [...caseListMap.values()].flat(),
    groups: [...groupMap.values()],
    groupCounts: groupCounts,
    totalCount: group?.[0]?.counts?.[1] ?? 0,
  };
};
