import { useEffect, useMemo, useState } from 'react';
import { traverseTreeNodes } from '@/pages/repository/util';
import { clone, sum } from 'lodash';
import { useDeepCompareEffect, useRequest } from 'ahooks';
import { getRepositoryTreeV2 } from '@/lib/api/item';
// import { TestType } from 'common/constant';

interface VirtualScrollList {
  groups: Record<string, any>;
  items?: Record<string, any>[];
  groupCounts: number[];
  totalCount: number;
  groupArray: Map<string, Record<string, any>>;
}

export const useGetVirtualScrollList = (
  group,
  // caseListMap,
  current?: number,
): VirtualScrollList => {
  const [groupMap, setGroupMap] = useState<Map<string, Record<string, any>>>(new Map());
  const [groupArray, setGroupArray] = useState<Map<string, Record<string, any>>>(new Map());
  // const [groupCounts, setGroupCounts] = useState<number[]>([]);

  useDeepCompareEffect(() => {
    if (group?.length) {
      const map = new Map();
      const mapArray = new Map();
      traverseTreeNodes(group, node => {
        mapArray.set(node.key, node);
        if (node?.counts[0]) {
          map.set(node.key, node);
        }
      });
      setGroupMap(map);
      setGroupArray(mapArray);
    }
  }, [group, current]);

  return {
    groupArray,
    groups: [...groupMap.values()],
    groupCounts: [],
    totalCount: group?.[0]?.counts?.[1] ?? 0,
  };
};

export const useGetGroupNodeId = (group, allCaseIds) => {
  const [groupNodeMap, setGroupNodeMap] = useState(new Map());

  useEffect(() => {
    if (allCaseIds?.length) {
      const itemIds = clone(allCaseIds);
      traverseTreeNodes(group, node => {
        groupNodeMap.set(node.key, itemIds?.splice(0, node?.counts[0]) ?? []);
      });
      setGroupNodeMap(groupNodeMap);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCaseIds, group]);

  return { groupNodeMap: groupNodeMap };
};

export const useGetGroupCounts = ({ workspaceKey, current, params, selectedNode }) => {
  const { data: treeData } = useRequest(
    async () => {
      if (!workspaceKey) return [];
      const { data } = await getRepositoryTreeV2({
        workspaceKey,
        params: params,
      });

      return [data];
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [workspaceKey, params, selectedNode],
      cacheKey: `Tree_Counts_${workspaceKey}_${JSON.stringify(
        params,
      )}_${selectedNode?.counts?.toString()}`,
      cacheTime: 999999,
      staleTime: 999999,
    },
  );

  const groupCounts = useMemo(() => {
    let counts = [];
    if (treeData?.length) {
      traverseTreeNodes(treeData, node => {
        if (node?.counts?.[0]) {
          const sumCounts = sum(counts);
          const currentNum = current * 100;
          if (sumCounts < currentNum) {
            counts = counts.concat(
              sumCounts + node.counts[0] <= currentNum ? node.counts[0] : currentNum - sumCounts,
            );
          }
        }
      });
    }

    return counts;
  }, [treeData, current]);

  return {
    groupCounts: groupCounts,
    treeData,
  };
};
