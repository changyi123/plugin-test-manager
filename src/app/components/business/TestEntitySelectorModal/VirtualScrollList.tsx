import { Checkbox } from 'antd';
import { clone, pullAll } from 'lodash';
import React, { useCallback } from 'react';
import { GroupedVirtuoso } from 'react-virtuoso';
import { getCheckedByType } from './helper';
import { useGetVirtualScrollList } from './hooks';

interface VirtualScrollListProps {
  group?: any[];
  allCaseIds?: string[];
  item?: Record<string, any>[];
  selectCaseIdsSet?: Set<string>;
  ignoreTestDetailIdsSet?: Set<string>;
  setSelectCaseIdsSet?: (val?: Set<string>) => void;
}

const VirtualScrollList: React.FC<VirtualScrollListProps> = props => {
  const { group, allCaseIds, item, ignoreTestDetailIdsSet, selectCaseIdsSet, setSelectCaseIdsSet } =
    props;
  const { groupCounts, groups, items } = useGetVirtualScrollList(group, item, allCaseIds);

  const groupContent = useCallback(
    index => {
      const nodeCaseIds = [...(groups?.[index]?.nodeCaseIdsSet ?? [])];
      return (
        <Checkbox
          disabled={getCheckedByType(
            [...(groups?.[index]?.nodeCaseIdsSet ?? [])],
            ignoreTestDetailIdsSet,
          )}
          indeterminate={getCheckedByType(
            [...(groups?.[index]?.nodeCaseIdsSet ?? [])],
            selectCaseIdsSet,
            'indeterminate',
          )}
          checked={getCheckedByType([...(groups?.[index]?.nodeCaseIdsSet ?? [])], selectCaseIdsSet)}
          onChange={e => {
            const ids = pullAll(clone(nodeCaseIds), [...(ignoreTestDetailIdsSet ?? [])]);
            const set = new Set([...(selectCaseIdsSet ?? [])]);
            if (e.target.checked) {
              setSelectCaseIdsSet(new Set(ids.concat([...set])));
            } else {
              ids.forEach(d => {
                set.has(d) && set.delete(d);
              });
              setSelectCaseIdsSet(set);
            }
          }}
        >
          {groups?.[index]?.name}
        </Checkbox>
      );
    },
    [groups, selectCaseIdsSet, ignoreTestDetailIdsSet, setSelectCaseIdsSet],
  );
  const itemContent = useCallback(
    index => (
      <Checkbox
        onChange={e => {
          const id = items?.[index]?.id;
          const set = new Set([...(selectCaseIdsSet ?? [])]);
          if (e.target.checked) {
            set.add(id);
          } else {
            set.delete(id);
          }
          setSelectCaseIdsSet(set);
        }}
        disabled={ignoreTestDetailIdsSet?.has(items?.[index]?.id)}
        checked={selectCaseIdsSet?.has(items?.[index]?.id)}
      >
        {items?.[index]?.name}
      </Checkbox>
    ),
    [ignoreTestDetailIdsSet, items, selectCaseIdsSet, setSelectCaseIdsSet],
  );

  return (
    <GroupedVirtuoso
      onScroll={e => console.log((e.target as any).scrollTop)}
      style={{ height: '400px' }}
      groupCounts={groupCounts}
      groupContent={groupContent}
      itemContent={itemContent}
    />
  );
};

export default React.memo(VirtualScrollList);
