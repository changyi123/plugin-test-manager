import { traverseTreeNodes } from '@/pages/repository/util';
import { useEffect, useState } from 'react';

const handleItem = (data, groupMap) => {
  data.forEach(item => {
    const node = groupMap.get(groupMap.has(item.repository) ? item.repository : 'root');
    if (groupMap.has(item.repository)) {
      groupMap.set(item.repository, {
        ...node,
        items: (node.items ?? []).concat(item),
      });
    } else {
      groupMap.set('root', {
        ...node,
        items: (node.items ?? []).concat(item),
      });
    }
  });

  return groupMap;
};

export const useGetVirtualScrollList = (group, item) => {
  const [groupMap, setGroupMap] = useState<Map<string, Record<string, any>>>(new Map());
  const [groupCounts, setGroupCounts] = useState<string[]>([]);

  useEffect(() => {
    if (group?.length) {
      console.log('左侧树刷新一次----------------->', group);
      const map = new Map();
      let counts = [];
      traverseTreeNodes(group, node => {
        map.set(node.key, {
          ...node,
          isGroup: true,
        });
        counts = counts.concat(node.counts[0]);
      });

      setGroupMap(map);
      setGroupCounts(counts);
    }
  }, [group]);

  useEffect(() => {
    if (item?.length) {
      setGroupMap(handleItem(item, groupMap));
    }
  }, [groupMap, item]);
  console.log('hooks刷新一次----------------->', group);

  return {
    groups: [...groupMap.values()],
    groupCounts: groupCounts,
    items: [...groupMap.values()].map(d => d.items).flat(),
  };
};
