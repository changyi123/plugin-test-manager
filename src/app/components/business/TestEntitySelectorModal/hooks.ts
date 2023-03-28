import { useEffect, useState } from 'react';
import { traverseTreeNodes } from '@/pages/repository/util';
import { clone } from 'lodash';

interface VirtualScrollList {
  groups: Record<string, any>;
  items: Record<string, any>;
  groupCounts: number[];
  totalCount: number;
}

export const useGetVirtualScrollList = (group, item, allCaseIds?: string[]): VirtualScrollList => {
  const [groupMap, setGroupMap] = useState<Map<string, Record<string, any>>>(new Map());
  const [groupCounts, setGroupCounts] = useState<number[]>([]);

  useEffect(() => {
    if (group?.length) {
      const map = new Map();
      const itemIds = clone(allCaseIds);
      let counts = [];
      traverseTreeNodes(group, node => {
        if (node?.counts[0]) {
          map.set(node.key, {
            ...node,
            isGroup: true,
            nodeCaseIdsSet: new Set(itemIds?.splice(0, node?.counts[0]) ?? []),
          });
          counts = counts.concat(node.counts[0]);
        }
      });
      setGroupMap(map);
      setGroupCounts(counts);
    }
  }, [group, allCaseIds]);

  return {
    groups: [...groupMap.values()],
    groupCounts: groupCounts,
    items: item,
    totalCount: group?.[0]?.counts?.[1] ?? 0,
  };
};
