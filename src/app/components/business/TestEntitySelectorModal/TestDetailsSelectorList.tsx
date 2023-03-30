/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useMemo, useState } from 'react';
import { Checkbox, Empty, Select, Spin, Tooltip } from 'antd';
import { useRequest, useUpdateEffect } from 'ahooks';
import emptyImg from '@/icons/svg/empty-data.png';
import { CaretDownOutlined, CaretUpOutlined, LoadingOutlined } from '@ant-design/icons';
import { getLinkedTestEntityByQuery, getTestEntityByQuery } from '@/lib/api/item';
import { TestLinkType, TestType } from '@/lib/constants';
import { FieldKey } from 'common/types/api';
import useI18n from '@/lib/hooks/useI18n';
import { getReportKey, getRepositoryQuery } from '@/lib/utils/tree';
import VirtualScrollList from './virtualScrollList';
import { clone, pullAll } from 'lodash';
import { getCheckedByType } from './helper';

import cx from './TestDetailsSelectorList.less';
import { useGetGroupCounts } from './hooks';

interface TestDetailsSelectorListProps {
  workspaceKey?: string;
  selectedNode?: any;
  searchName?: string;
  ignoreTestDetailIds?: string[];
  selectedTestDetailIds?: string[];
  setSelectedTestDetailIds?: (val: any) => void;
  treeType?: string;
  planLinkCaseIds?: string[];
  planId?: string;
  treeProps?: Record<string, any>;
}

const TestDetailsSelectorList: React.FC<TestDetailsSelectorListProps> = ({
  workspaceKey,
  selectedNode,
  searchName,
  ignoreTestDetailIds,
  planLinkCaseIds,
  setSelectedTestDetailIds,
  treeType,
  planId,
  treeProps,
}) => {
  const { t } = useI18n();
  const [showType, setShowType] = useState('all');
  const [orderByCratedAt, setOrderByCratedAt] = useState<'asc' | 'desc'>('asc');
  // const searchName = useMemo(() => (selectors?.[0] as any)?.name?.value, [selectors]);
  const [selectCaseIdsSet, setSelectCaseIdsSet] = useState<Set<string> | null>(null);
  const ignoreTestDetailIdsSet = useMemo(() => new Set(ignoreTestDetailIds), [ignoreTestDetailIds]);
  const [caseListMap, setCaseListMap] = useState<Map<number, Record<string, any>[]>>(new Map());
  const [planCaseListMap, setPlanCaseListMap] = useState<Map<number, Record<string, any>[]>>(
    new Map(),
  );
  const [current, setCurrent] = useState(1);

  const { data: allCaseIds, loading: allCaseIdsLoading } = useRequest(
    async () => {
      if (!workspaceKey || !selectedNode?.key || treeType === 'plan') return;
      const repository = getRepositoryQuery(selectedNode, showType);
      const allNodeKeys = getReportKey([selectedNode]);

      const { list: data } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          ...repository,
        },
        ascending: ['sortIndex', 'createdAt'],
        limit: 99999,
        sortByRepositoryIds: allNodeKeys,
        onlySelectId: true,
      });

      return data as string[];
    },
    {
      refreshDeps: [workspaceKey, selectedNode, treeType],
      cacheKey: `Repository_${selectedNode?.key ?? ''}_${treeType}_${workspaceKey}`,
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  const caseIds = useMemo(() => {
    const ids = treeType === 'plan' ? planLinkCaseIds : allCaseIds;
    return pullAll(clone(ids), ignoreTestDetailIds);
  }, [allCaseIds, treeType, planLinkCaseIds, ignoreTestDetailIds]);

  const getTestCaseByRepository = useCallback(
    async ({ baseQueryOptions, repository, allNodeKeys, name }) => {
      const query: any = {};
      if (name) {
        query.name = name;
      }
      if (repository) {
        query.repository = repository.repository;
      }
      const { list, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          ...query,
        },
        ...baseQueryOptions,
        offset: (current - 1) * 100,
        limit: 100,
        select: ['id', 'name'],
        sortByRepositoryIds: allNodeKeys,
      });

      return { list, total };
    },
    [workspaceKey, current],
  );

  const getTestCaseByPlan = useCallback(
    async ({ baseQueryOptions, repository, allNodeKeys, name }) => {
      const query: any = {};
      if (name) {
        query.name = name;
      }
      if (repository) {
        query.repository = repository.repository;
      }
      const { list, total } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          ...query,
        },
        ...baseQueryOptions,
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [planId],
        destinationType: TestType.Case,
        offset: (current - 1) * 100,
        limit: 100,
        select: ['id', 'name'],
        sortByRepositoryIds: allNodeKeys,
      });

      return { list, total };
    },
    [workspaceKey, current],
  );

  // 查询当前用例库下所有测试用例
  const {
    data: testCaseData,
    loading: testCaseListLoading,
    // refresh: refreshTestCase,
  } = useRequest(
    async () => {
      if (!workspaceKey || !selectedNode?.key || !showType) return;
      const baseQueryOptions: {
        ascending?: FieldKey[];
        descending?: FieldKey[];
      } =
        orderByCratedAt === 'asc'
          ? {
              ascending: ['sortIndex', 'createdAt'],
            }
          : {
              descending: ['sortIndex', 'createdAt'],
            };
      const repository = getRepositoryQuery(selectedNode, showType);
      const allNodeKeys = getReportKey([selectedNode]);

      if (treeType !== 'plan') {
        return await getTestCaseByRepository({
          baseQueryOptions,
          repository,
          allNodeKeys,
          name: searchName,
        });
      }

      return await getTestCaseByPlan({
        baseQueryOptions,
        repository,
        allNodeKeys,
        name: searchName,
      });
    },
    {
      refreshDeps: [
        workspaceKey,
        searchName,
        treeType,
        current,
        selectedNode,
        showType,
        orderByCratedAt,
      ],
      cacheKey: `Repository_${
        selectedNode?.key ?? ''
      }_${searchName}_${showType}_${current}_${treeType}_${orderByCratedAt}${workspaceKey}`,
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  const { list: testCaseList, total = 0 } = testCaseData ?? {};

  const params = useMemo(
    () =>
      treeType === 'plan'
        ? {
            query: {
              workspaceKey,
              type: TestType.Case,
              name: searchName,
              ...getRepositoryQuery(selectedNode, showType),
            },
            linkType: TestLinkType.CaseLinkPlan,
            sourceIds: [planId],
            destinationType: TestType.Case,
          }
        : {
            query: {
              workspaceKey,
              type: TestType.Case,
              name: searchName,
              ...getRepositoryQuery(selectedNode, showType),
            },
          },
    [treeProps, showType, selectedNode],
  );

  const { groupCounts } = useGetGroupCounts({ workspaceKey, current, params });

  const showList = useMemo(() => {
    if (treeType === 'plan') {
      return !![...planCaseListMap.values()].flat()?.length;
    }
    return !![...caseListMap.values()].flat()?.length;
  }, [treeType, planCaseListMap, caseListMap]);

  useUpdateEffect(() => {
    if (!testCaseList) return;
    if (treeType === 'plan') {
      if (!testCaseListLoading) {
        const map = new Map(planCaseListMap.entries());
        map.set(current, testCaseList);
        setPlanCaseListMap(map);
      }
    } else {
      if (!testCaseListLoading) {
        const map = new Map(caseListMap.entries());
        map.set(current, testCaseList);
        setCaseListMap(map);
      }
    }
  }, [testCaseList]);

  useUpdateEffect(() => {
    if (selectedNode?.key) return;
    if (treeType === 'plan') {
      setPlanCaseListMap(new Map());
      setCurrent(1);
    } else {
      setCaseListMap(new Map());
      setCurrent(1);
    }
  }, [showType, searchName, selectedNode]);

  useUpdateEffect(() => {
    if (treeType) {
      // refreshTestCase();
      setSelectCaseIdsSet(new Set());
    }
  }, [treeType]);

  useUpdateEffect(() => {
    setSelectedTestDetailIds([...selectCaseIdsSet]);
  }, [selectCaseIdsSet]);

  const checkAllTest = useCallback(
    e => {
      setSelectCaseIdsSet(e.target.checked ? new Set(clone(caseIds)) : new Set([]));
    },
    [caseIds],
  );

  return (
    <div className={'case-selector'}>
      <div className={cx('detail-selector-header')}>
        <Checkbox
          disabled={allCaseIdsLoading || getCheckedByType(caseIds, ignoreTestDetailIdsSet)}
          indeterminate={getCheckedByType(caseIds, selectCaseIdsSet, 'indeterminate')}
          checked={getCheckedByType(caseIds, selectCaseIdsSet)}
          onChange={checkAllTest}
        >
          <span className={cx('check-all-title')}>
            {t('common.checked')}
            <span className={cx('num')}> {selectCaseIdsSet?.size ?? 0}</span>
            <span>
              {' / '}
              {allCaseIdsLoading ? <LoadingOutlined /> : total}
            </span>
          </span>
        </Checkbox>
        <div className={cx('detail-header-right')}>
          <Select
            style={{ width: 165 }}
            value={showType}
            options={[
              {
                value: 'all',
                label: t('page.plan.planPageLayout.right.showChild'),
              },
              {
                value: 'current',
                label: t('page.plan.planPageLayout.right.showCur'),
              },
            ]}
            getPopupContainer={e => e.parentNode}
            onChange={val => setShowType(val)}
          ></Select>
          <Tooltip title={t('components.business.testEntitySelectorModal.addTimeSort')}>
            <span
              className={cx('action')}
              onClick={() => {
                setOrderByCratedAt(val => (val === 'asc' ? 'desc' : 'asc'));
              }}
            >
              <span>
                {orderByCratedAt === 'asc'
                  ? t('components.business.testEntitySelectorModal.earliest')
                  : t('components.business.testEntitySelectorModal.latest')}
              </span>
              <span className={cx('icon')}>
                <CaretUpOutlined className={cx(orderByCratedAt === 'asc' && 'activity')} />
                <CaretDownOutlined className={cx(orderByCratedAt === 'desc' && 'activity')} />
              </span>
            </span>
          </Tooltip>
        </div>
      </div>
      <div className={cx('detail-selector-body')}>
        <Spin spinning={testCaseListLoading}>
          {showList}
          {showList ? (
            <VirtualScrollList
              group={[selectedNode].filter(Boolean)}
              caseListMap={treeType === 'plan' ? planCaseListMap : caseListMap}
              selectCaseIdsSet={selectCaseIdsSet}
              setSelectCaseIdsSet={setSelectCaseIdsSet}
              ignoreTestDetailIdsSet={ignoreTestDetailIdsSet}
              allCaseIds={treeType === 'plan' ? planLinkCaseIds : allCaseIds}
              setCurrent={setCurrent}
              current={current}
              groupCounts={groupCounts}
            />
          ) : (
            <Empty
              className={cx('empty-test')}
              image={emptyImg}
              description={t('components.business.testEntitySelectorModal.notHaveCase')}
            />
          )}
        </Spin>
      </div>
    </div>
  );
};

export default React.memo(TestDetailsSelectorList);
