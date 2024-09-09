import { useDeepCompareEffect, useRequest } from 'ahooks';
import { useDebounceFn } from 'ahooks';
import { clone, sum } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getRepositoryTreeV2 } from '@/lib/api/item';
import { getWorkspaces } from '@/lib/api/proxima';
// import { TestType } from 'common/constant';
import { TEST_MANAGER_PLUGIN_KEY } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { escapeMatchesQueryArg } from '@/lib/utils/helper';
import { traverseTreeNodes } from '@/pages/repository/util';
import { AppsWorkspace, Workspace } from '@/services/models';

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
        if (node?.counts?.[0]) {
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
        groupNodeMap.set(node.key, itemIds?.splice(0, node?.counts?.[0]) ?? []);
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
      if (!workspaceKey || !params) return [];

      const { data } = await getRepositoryTreeV2({
        workspaceKey,
        params: params,
      });

      return [data];
    },
    {
      ready: Boolean(workspaceKey) && Boolean(selectedNode?.key),
      refreshDeps: [workspaceKey, params, selectedNode],
      cacheKey: `Tree_Counts_${workspaceKey}_${JSON.stringify({
        params,
        selectedNode,
      })}`,
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

const workspaceDataFormat = (w, currentWorkspace, showCurrent) =>
  w
    .map(d => ({ ...d, label: d.name, value: d.key }))
    .filter(showCurrent ? Boolean : i => i.key !== currentWorkspace);

// 根据关键字查询空间
export const usePluginWorkspace = ({ keyword, currentWorkspace, showCurrent }) => {
  const [isGlobal, setGlobal] = useState(null);
  const [bindWorkspaceKeys, setBindWorkspaceKeys] = useState([]);

  const [loading, setLoading] = useState(true);

  const [workspaces, setWorkspaces] = useState([]);

  // 查询插件是否全局插件
  useEffect(() => {
    new Parse.Query(AppsWorkspace)
      .equalTo('appKey', TEST_MANAGER_PLUGIN_KEY)
      .include('workspaces')
      .first({ json: true })
      .then((res: any) => {
        setGlobal(res.global);
        if (!res.global) {
          setBindWorkspaceKeys(res.workspaces?.map(item => item?.key ?? item).filter(Boolean));
        }
      });
  }, []);

  const onSearch = useCallback(() => {
    if (isGlobal === null) return;
    setLoading(true);
    if (isGlobal) {
      getWorkspaces({ pageIndex: 1, pageSize: 100, keyword }).then(res => {
        setWorkspaces(workspaceDataFormat(res.results, currentWorkspace, showCurrent));
        setLoading(false);
      });
    } else {
      new Parse.Query(Workspace)
        .containedIn('key', bindWorkspaceKeys)
        .limit(bindWorkspaceKeys.length)
        .matches('name', escapeMatchesQueryArg(keyword))
        .find({ json: true })
        .then(res => {
          setWorkspaces(workspaceDataFormat(res, currentWorkspace, showCurrent));
          setLoading(false);
        });
    }
  }, [bindWorkspaceKeys, currentWorkspace, isGlobal, keyword, showCurrent]);

  const { run: handleSearch } = useDebounceFn(onSearch, { wait: 300 });

  // 根据关键字查询空间
  useEffect(() => {
    if (isGlobal === null) return;
    handleSearch();
  }, [onSearch]);

  return {
    workspaces,
    loading,
  };
};

// 获取用例规划限制
export const useCasePlanRule = validateCaseStatus => {
  const { t } = useI18n();
  const {
    config: { statusList, listType },
  } = useTestConfig();
  const getEnableToPlan = useCallback(
    statusId => {
      if (!validateCaseStatus) return true;
      const existInStatusList = statusList?.some(status => status?.statusId === statusId);
      return !listType || (listType === 'black' ? !existInStatusList : existInStatusList);
    },
    [listType, statusList, validateCaseStatus],
  );
  const getToolTipFun = useCallback(
    statusId => {
      const enableToPlan = getEnableToPlan(statusId);
      const statusNames = statusList?.map(s => s.name).join('、');
      return name =>
        enableToPlan
          ? name
          : listType === 'black'
          ? t('common.blackCaseRule', { statusNames })
          : t('common.whiteCaseRule', { statusNames });
    },
    [getEnableToPlan, listType, statusList, t],
  );

  return {
    getEnableToPlan,
    getToolTipFun,
    statusList,
    listType,
  };
};
