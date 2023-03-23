import React, { useEffect, useState } from 'react';
import { traverseTreeNodes } from '@/pages/repository/util';
import { GroupedVirtuoso } from 'react-virtuoso';
import { useGetVirtualScrollList } from './hooks';

interface VirtualScrollListProps {
  group?: any[];
  item?: Record<string, any>[];
}

// const handleItem = (data, groupMap) => {
//   data.forEach(item => {
//     const node = groupMap.get(groupMap.has(item.repository) ? item.repository : 'root');
//     if (groupMap.has(item.repository)) {
//       groupMap.set(item.repository, {
//         ...node,
//         items: (node.items ?? []).concat(item),
//       });
//     } else {
//       groupMap.set('root', {
//         ...node,
//         items: (node.items ?? []).concat(item),
//       });
//     }
//   });

//   return groupMap;
// };

// const getVirList = groupMap =>
//   [...groupMap?.values()].reduce((prev, cur) => {
//     if (cur.items.length) {
//       prev = prev.concat(cur, cur.items);
//     }
//     return prev;
//   }, []);

const VirtualScrollList: React.FC<VirtualScrollListProps> = props => {
  const { group, item } = props;
  // const [groupMap, setGroupMap] = useState<Map<string, Record<string, any>>>(new Map());
  // const [virtualList, setVirtualList] = useState<Record<string, any>[]>(null);

  const { groupCounts, groups, items } = useGetVirtualScrollList(group, item);

  console.log('useGetVirtualScrollList ------------------------->', groups, items);

  // useEffect(() => {
  //   if (group?.length) {
  //     const map = new Map();

  //     traverseTreeNodes(group, node => {
  //       map.set(node.key, {
  //         ...node,
  //         isGroup: true,
  //       });
  //     });

  //     setGroupMap(map);
  //   }
  // }, [group]);

  // useEffect(() => {
  //   if (item?.length) {
  //     // setVirtualList(getVirList(handleItem(item, groupMap)));
  //     setGroupMap(handleItem(item, groupMap));
  //   }
  // }, [groupMap, item]);

  return (
    <GroupedVirtuoso
      style={{ height: '400px' }}
      groupCounts={groupCounts}
      groupContent={index => (
        <div>
          用例库-{index}-{groups[index].name}
        </div>
      )}
      itemContent={index => {
        return (
          <div>
            事项-{index}-{items?.[index]?.name ?? ''}
          </div>
        );
      }}
    />
  );
};

export default VirtualScrollList;
