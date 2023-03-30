import React, { useCallback } from 'react';
import { Checkbox } from 'antd';
import { clone, pullAll } from 'lodash';
import { GroupedVirtuoso } from 'react-virtuoso';
import { filterIgnoreTestCaseId, getCheckedByType, handleGroupPath } from './helper';
import { useGetVirtualScrollList } from './hooks';

import cx from './VirtualScrollList.less';

interface VirtualScrollListProps {
  group?: any[];
  allCaseIds?: string[];
  caseListMap?: Map<number, Record<string, any>[]>;
  current?: number;
  selectCaseIdsSet?: Set<string>;
  ignoreTestDetailIdsSet?: Set<string>;
  setSelectCaseIdsSet?: (val?: Set<string>) => void;
  setCurrent?: (val: number) => void;
}

const VirtualScrollList: React.FC<VirtualScrollListProps> = props => {
  const {
    group,
    allCaseIds,
    caseListMap,
    current,
    ignoreTestDetailIdsSet,
    selectCaseIdsSet,
    setSelectCaseIdsSet,
    setCurrent,
  } = props;

  const { groupArray, groupCounts, groups, items, totalCount } = useGetVirtualScrollList(
    group,
    caseListMap,
    allCaseIds,
    current,
  );

  const groupContent = useCallback(
    index => {
      const nodeCaseIds = [...(groups?.[index]?.nodeCaseIdsSet ?? [])];
      const pathName = handleGroupPath(groupArray, groups?.[index]?.key);
      const PathDom = ({ name }) => {
        return typeof name === 'string' ? (
          <span className={cx('name')}>{name}</span>
        ) : (
          <span className={cx('path-box')}>
            <span className={cx('path')}>{name?.[0]}</span>
            <span className={cx('cur-name')}>/{name?.[1]}</span>
          </span>
        );
      };
      return (
        <div className={cx('detail-list-box')}>
          <Checkbox
            disabled={getCheckedByType(
              [...(groups?.[index]?.nodeCaseIdsSet ?? [])],
              ignoreTestDetailIdsSet,
            )}
            indeterminate={getCheckedByType(
              filterIgnoreTestCaseId(groups?.[index]?.nodeCaseIdsSet, ignoreTestDetailIdsSet),
              selectCaseIdsSet,
              'indeterminate',
            )}
            checked={getCheckedByType(
              [...(groups?.[index]?.nodeCaseIdsSet ?? [])],
              new Set([...(selectCaseIdsSet ?? []), ...(ignoreTestDetailIdsSet ?? [])]),
            )}
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
            <PathDom name={pathName} />
          </Checkbox>
        </div>
      );
    },
    [groups, groupArray, selectCaseIdsSet, ignoreTestDetailIdsSet, setSelectCaseIdsSet],
  );

  const itemContent = useCallback(
    index => (
      <div className={cx('detail-list')}>
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
          checked={
            selectCaseIdsSet?.has(items?.[index]?.id) ||
            ignoreTestDetailIdsSet?.has(items?.[index]?.id)
          }
        >
          <span className={cx('title')}>{items?.[index]?.name}</span>
        </Checkbox>
      </div>
    ),
    [ignoreTestDetailIdsSet, items, selectCaseIdsSet, setSelectCaseIdsSet],
  );

  return (
    <>
      {items?.length ? (
        <GroupedVirtuoso
          className={cx('group-virtuoso')}
          style={{ height: '400px' }}
          groupCounts={groupCounts}
          groupContent={groupContent}
          itemContent={itemContent}
          atBottomStateChange={atBottom => {
            if (atBottom) {
              if (!totalCount) return;
              if (current * 100 >= totalCount) return;
              setCurrent(current + 1);
            }
          }}
        />
      ) : (
        ''
      )}
    </>
  );
};

export default React.memo(VirtualScrollList);
