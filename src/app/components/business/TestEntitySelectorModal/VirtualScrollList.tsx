import { Checkbox, Empty, Tooltip } from 'antd';
import _, { clone, pullAll } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { GroupedVirtuoso } from 'react-virtuoso';

import OverflowTooltip from '@/components/common/OverflowTooltip';
import emptyImg from '@/icons/svg/empty-data.png';
import useI18n from '@/lib/hooks/useI18n';
import { getRootContainer } from '@/lib/utils/helper';
import fetch from '@/lib/utils/fetch';

import { filterIgnoreTestCaseId, getCheckedByType, handleGroupPath } from './helper';
import { useCasePlanRule, useGetGroupNodeId, useGetVirtualScrollList } from './hooks';

import CusDropdown from '@/components/business/TestEntitySelectorModal/CusDropdown';
import cx from './VirtualScrollList.less';

interface VirtualScrollListProps {
  groupCounts?: number[];
  group?: any[];
  allCaseIds?: string[];
  workspaceKey?: string;
  caseListMap?: Map<number, Record<string, any>[]>;
  current?: number;
  selectCaseIdsSet?: Set<string>;
  ignoreTestDetailIdsSet?: Set<string>;
  isPlanForTestSet?: boolean;
  testSetId?: string;
  disabledIdsSet?: Set<string>;
  setSelectCaseIdsSet?: (val?: Set<string>) => void;
  setCurrent?: (val: number) => void;
  validateCaseStatus?: boolean;
  loading?: boolean;
  enableCaseVersion?: boolean;
  versionMapKeySelected?: Record<string, string>;
  setVersionMapKeySelected?: any
}

const VirtualScrollList: React.FC<VirtualScrollListProps> = props => {
  const {
    group,
    groupCounts,
    allCaseIds,
    caseListMap,
    current,
    ignoreTestDetailIdsSet,
    disabledIdsSet,
    selectCaseIdsSet,
    setSelectCaseIdsSet,
    setCurrent,
    validateCaseStatus,
    loading,
    testSetId,
    isPlanForTestSet = false,
    enableCaseVersion = false,
    versionMapKeySelected,
    setVersionMapKeySelected
  } = props;
  const { t } = useI18n();
  const { groupArray, groups, totalCount } = useGetVirtualScrollList(group, current);
  const [versionMapKey, setVersionMapKey] = useState({})
  
  const handleItemsLinkKeys = useCallback(async(_items) => {
    const _keys = _.uniq(_.map(_items, 'key'))
    const res = await fetch.post('/parse/api/search', {
      iql:`'key' in ${JSON.stringify(_keys)} and 'baseLineSources' in ['BaseLineItemVersion'] order by createdAt desc`,
      size: 9999,
      includeHiddenItem: true
    });
    const _newArr = _.map(_.get(res, 'data.payload.items', []), (_case) => _.pick(_case, ['key', 'id', 'itemId', 'values.baseLineItemVersion.name']))
    const _arrLableKey = _.map(_newArr, (_case) => ({ label:  _case?.values?.baseLineItemVersion?.name, value: _case.id, itemId: _case?.itemId, itemKey: _case?.key}))
    const _versionMapKey = _.groupBy(_arrLableKey, 'itemKey')
    setVersionMapKey(_versionMapKey)
  }, [])

  const items = useMemo(() => {
    const _items = [...caseListMap.values()].flat()
    handleItemsLinkKeys(_items)
    return _items
  }, [caseListMap]);

  const { groupNodeMap } = useGetGroupNodeId(group, allCaseIds);
  const { getToolTipFun } = useCasePlanRule(validateCaseStatus);
  const groupContent = useCallback(
    index => {
      const nodeCaseIds = groupNodeMap?.get(groups?.[index]?.key) ?? [];
      const pathName = handleGroupPath(groupArray, groups?.[index]?.key);
      const PathDom = ({ name }) => {
        return typeof name === 'string' ? (
          <OverflowTooltip className={cx('name')} title={name}>
            {name}
          </OverflowTooltip>
        ) : (
          <Tooltip className={cx('path-box')} title={name.join('/')}>
            <span className={cx('path')}>{name?.[0]}</span>
            <span className={cx('cur-name')}>/{name?.[1]}</span>
          </Tooltip>
        );
      };
      return (
        <div className={cx('detail-list-box')}>
          <Checkbox
            disabled={getCheckedByType(
              nodeCaseIds,
              new Set([...(ignoreTestDetailIdsSet || []), ...(disabledIdsSet || [])]),
            )}
            indeterminate={getCheckedByType(
              filterIgnoreTestCaseId(new Set(nodeCaseIds), ignoreTestDetailIdsSet),
              selectCaseIdsSet,
              'indeterminate',
            )}
            checked={getCheckedByType(
              nodeCaseIds,
              new Set([...(selectCaseIdsSet ?? []), ...(ignoreTestDetailIdsSet ?? [])]),
            )}
            onChange={e => {
              const ids = pullAll(clone(nodeCaseIds), [
                ...(ignoreTestDetailIdsSet ?? []),
                ...(disabledIdsSet ?? []),
              ]);
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
          {enableCaseVersion && <div>{t('page.plan.testEntityList.caseVersion')}</div>}
        </div>
      );
    },
    [
      groupNodeMap,
      groups,
      groupArray,
      ignoreTestDetailIdsSet,
      selectCaseIdsSet,
      disabledIdsSet,
      setSelectCaseIdsSet,
      enableCaseVersion,
    ],
  );

  const itemContent = useCallback(
    index => {
      return (
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
            disabled={
              ignoreTestDetailIdsSet?.has(items?.[index]?.id) ||
              disabledIdsSet?.has(items?.[index]?.id) ||
              (isPlanForTestSet && (items?.[index]?.testSet || []).includes(testSetId))
            }
            checked={
              selectCaseIdsSet?.has(items?.[index]?.id) ||
              ignoreTestDetailIdsSet?.has(items?.[index]?.id) ||
              (isPlanForTestSet && (items?.[index]?.testSet || []).includes(testSetId))
            }
          >
            <Tooltip
              getPopupContainer={getRootContainer}
              className={cx('name')}
              title={getToolTipFun(items?.[index]?.workflowStatus?.objectId)(items?.[index]?.name)}
            >
              {items?.[index]?.name}
            </Tooltip>
          </Checkbox>
          {enableCaseVersion && (
            <CusDropdown
              disabled={
                ignoreTestDetailIdsSet?.has(items?.[index]?.id) ||
                disabledIdsSet?.has(items?.[index]?.id)
                //  || !_.toArray(selectCaseIdsSet).includes(items?.[index]?.id)
              }
              option={versionMapKey[items?.[index]?.key] || []}
              value={
                versionMapKeySelected[items?.[index]?.id] ||
                items?.[index]?.baseLineItemVersion?.name ||
                '-'
              }
              onChange={v => {
                const _obj = {};
                _obj[items?.[index]?.id] = v;
                setVersionMapKeySelected(_v => {
                  return { ..._v, ..._obj };
                });
              }}
            />
          )}
        </div>
      );
    },
    [
      disabledIdsSet,
      getToolTipFun,
      ignoreTestDetailIdsSet,
      items,
      selectCaseIdsSet,
      setSelectCaseIdsSet,
      enableCaseVersion,
      versionMapKeySelected,
      setVersionMapKeySelected,
    ],
  );

  return (
    <>
      {items?.length ? (
        <GroupedVirtuoso
          className={cx('group-virtuoso')}
          style={{ height: '400px' }}
          disabled={loading}
          groupCounts={groupCounts}
          groupContent={groupContent}
          itemContent={itemContent}
          atBottomStateChange={atBottom => {
            if (atBottom) {
              if (loading) return;
              if (!items?.length) return;
              if (!groupCounts?.length) return;
              if (!totalCount) return;
              if (current * 100 >= totalCount) return;
              setCurrent(current + 1);
            }
          }}
        />
      ) : (
        <Empty
          className={cx('empty-test')}
          image={emptyImg}
          description={t('components.business.testEntitySelectorModal.notHaveCase')}
        />
      )}
    </>
  );
};

export default React.memo(VirtualScrollList);
