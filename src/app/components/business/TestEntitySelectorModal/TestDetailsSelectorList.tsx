/* eslint-disable react-hooks/exhaustive-deps */
import { CaretDownOutlined, CaretUpOutlined, LoadingOutlined } from '@ant-design/icons';
import { useRequest, useUpdateEffect } from 'ahooks';
import { Checkbox, Empty, Select, Spin, Tooltip } from 'antd';
import { FieldKey } from 'common/types/api';
import { clone, pullAll } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';

import emptyImg from '@/icons/svg/empty-data.png';
import { getLinkedTestEntityByQuery, getTestEntityByQuery } from '@/lib/api/item';
import { TestLinkType, TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { SearchSelectors } from '@/lib/utils/iql';
import { getReportKey, getRepositoryQuery } from '@/lib/utils/tree';

import { getCheckedByType } from './helper';
import { useCasePlanRule, useGetGroupCounts } from './hooks';
import cx from './TestDetailsSelectorList.less';
import VirtualScrollList from './VirtualScrollList';

interface TestDetailsSelectorListProps {
  workspaceKey?: string;
  selectedNode?: any;
  searchName?: string;
  selectors?: SearchSelectors;
  ignoreTestDetailIds?: string[];
  selectedTestDetailIds?: string[];
  setSelectedTestDetailIds?: (val: any) => void;
  treeType?: string;
  planId?: string;
  caseSetId?: string;
  isPlanForTestSet?: boolean; // 当为true时候，查询用例的时候会把用例关联的用例集给查出来，然后用来判断该用例是否可以选中
  treeProps?: Record<string, any>;
  validateCaseStatus?: boolean;
}

const TestDetailsSelectorList: React.FC<TestDetailsSelectorListProps> = ({
  workspaceKey,
  selectedNode,
  searchName,
  ignoreTestDetailIds,
  setSelectedTestDetailIds,
  treeType,
  planId,
  caseSetId,
  isPlanForTestSet = false,
  selectors: selector,
  validateCaseStatus = false,
}) => {
  const { t } = useI18n();
  const [showType, setShowType] = useState('all');
  const [orderByCratedAt, setOrderByCratedAt] = useState<'asc' | 'desc'>('asc');
  const [selectCaseIdsSet, setSelectCaseIdsSet] = useState<Set<string> | null>(null);
  const ignoreTestDetailIdsSet = useMemo(() => new Set(ignoreTestDetailIds), [ignoreTestDetailIds]);
  const [caseListMap, setCaseListMap] = useState<Map<number, Record<string, any>[]>>(new Map());
  const [planCaseListMap, setPlanCaseListMap] = useState<Map<number, Record<string, any>[]>>(
    new Map(),
  );
  const [current, setCurrent] = useState(1);

  const { data: planLinkCases } = useRequest(
    async () => {
      if (!workspaceKey || !planId) return [];
      if (treeType !== 'plan') return [];
      const allNodeKeys = getReportKey([selectedNode]);
      const repository = getRepositoryQuery(selectedNode, showType);
      // 测试全部用例 ID
      const { list: caseIds } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          name: searchName,
          ...repository,
        },
        selector,
        limit: 99999,
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [planId],
        destinationType: TestType.Case,
        sortByRepositoryIds: allNodeKeys,
        select: ['id', 'status'],
      });

      return caseIds;
    },
    {
      ready: Boolean(workspaceKey && planId && selectedNode?.key),
      refreshDeps: [planId, workspaceKey, treeType, selectedNode, showType, searchName],
      cacheKey: `planLinkCaseIds_${
        selectedNode?.key ?? ''
      }_${selectedNode?.counts?.toString()}_${treeType}_${workspaceKey}_${planId}_${showType}_${searchName}`,
      cacheTime: 99999,
      staleTime: 99999,
    },
  );
  const planLinkCaseIds = useMemo(() => planLinkCases?.map(({ id }) => id) ?? [], [planLinkCases]);

  const { data: allCases, loading: allCaseIdsLoading } = useRequest(
    async () => {
      if (!workspaceKey || !selectedNode?.key || treeType === 'plan') return;
      const repository = getRepositoryQuery(selectedNode, showType);
      const allNodeKeys = getReportKey([selectedNode]);

      const { list: data } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          name: searchName,
          ...repository,
        },
        selector,
        ascending: ['sortIndex', 'createdAt'],
        limit: 99999,
        sortByRepositoryIds: allNodeKeys,
        select: ['id', 'status', isPlanForTestSet ? 'testSet' : ''].filter(Boolean) as FieldKey[],
      });

      return data as Array<{ id: string; workflowStatus: { objectId: string } }>;
    },
    {
      refreshDeps: [workspaceKey, selectedNode, treeType, selector, showType],
      cacheKey: `Repository_${
        selectedNode?.key ?? ''
      }_${selectedNode?.counts?.toString()}_${treeType}_${showType}_${workspaceKey}_${
        typeof selector === 'object' ? JSON.stringify(selector) : selector
      }`,
      staleTime: 999999999,
      cacheTime: isPlanForTestSet ? 0 : 999999999,
    },
  );

  const allCaseIds = useMemo(() => allCases?.map(({ id }) => id) ?? [], [allCases]);

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
        select: ['id', 'name', 'status', isPlanForTestSet ? 'testSet' : ''].filter(Boolean),
        sortByRepositoryIds: allNodeKeys,
      });

      return { list, total };
    },
    [workspaceKey, current, selectedNode],
  );

  const getTestCaseByPlan = useCallback(
    async ({ baseQueryOptions, repository, allNodeKeys, name }) => {
      const query: any = {};
      if (name) {
        query.name = name;
      }
      if (repository) {
        repository.repository && (query.repository = repository.repository);
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
        select: ['id', 'name', 'status'],
        sortByRepositoryIds: allNodeKeys,
      });

      return { list, total };
    },
    [workspaceKey, current, selectedNode],
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
        selector?: string | SearchSelectors;
      } =
        orderByCratedAt === 'asc'
          ? {
              ascending: ['sortIndex', 'createdAt'],
              selector,
            }
          : {
              descending: ['sortIndex', 'createdAt'],
              selector,
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
        treeType,
        current,
        selectedNode,
        showType,
        orderByCratedAt,
        selector,
      ],
      cacheKey: `Repository_${selectedNode?.key ?? ''}_${selectedNode?.counts?.toString()}_${
        (typeof selector === 'object' ? JSON.stringify(selector) : selector) ?? ''
      }_${showType}_${current}_${treeType}_${orderByCratedAt}${workspaceKey}`,
      staleTime: 999999999,
      cacheTime: isPlanForTestSet ? 0 : 999999999,
    },
  );

  const { list: testCaseList, total = 0 } = testCaseData ?? {};
  const { getEnableToPlan } = useCasePlanRule(validateCaseStatus);
  const disabledIdsSet = useMemo(() => {
    return new Set<string>(
      (treeType === 'plan' ? planLinkCases : allCases)
        ?.filter(i => !getEnableToPlan(i.workflowStatus?.objectId))
        ?.map(i => i.id) || [],
    );
  }, [allCases, planLinkCases, treeType, validateCaseStatus]);

  const params = useMemo(() => {
    const query = {} as any;
    searchName && (query.name = searchName);
    if (selectedNode) {
      const repository = getRepositoryQuery(selectedNode, showType)?.repository;
      repository && (query.repository = repository);
    }
    return treeType === 'plan'
      ? {
          query: {
            workspaceKey,
            type: TestType.Case,
            ...query,
          },
          selector,
          linkType: TestLinkType.CaseLinkPlan,
          sourceIds: [planId],
          destinationType: TestType.Case,
        }
      : {
          query: {
            workspaceKey,
            type: TestType.Case,
            ...query,
          },
          selector,
        };
  }, [showType, selectedNode, selector]);

  const { groupCounts, treeData } = useGetGroupCounts({
    workspaceKey,
    current,
    params,
    selectedNode,
  });

  const group = useMemo(
    () => (treeType === 'plan' && selector ? treeData : [selectedNode])?.filter(Boolean),
    [selectedNode, treeData, selector, treeType],
  );

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
    setCurrent(1);
    if (selectedNode?.key) return;
    if (treeType === 'plan') {
      setPlanCaseListMap(new Map());
    } else {
      setCaseListMap(new Map());
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
      setSelectCaseIdsSet(
        e.target.checked
          ? new Set(clone(caseIds.filter(id => !disabledIdsSet.has(id))))
          : new Set([]),
      );
    },
    [caseIds],
  );

  return (
    <div className={'case-selector'}>
      <div className={cx('detail-selector-header')}>
        <Checkbox
          disabled={
            allCaseIdsLoading ||
            getCheckedByType(
              caseIds,
              new Set([...(ignoreTestDetailIdsSet ?? []), ...(disabledIdsSet ?? [])]),
            )
          }
          indeterminate={getCheckedByType(caseIds, selectCaseIdsSet, 'indeterminate')}
          checked={getCheckedByType(
            caseIds,
            new Set([...(selectCaseIdsSet ?? []), ...(disabledIdsSet ?? [])]),
          )}
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
              loading={testCaseListLoading}
              group={group}
              caseListMap={treeType === 'plan' ? planCaseListMap : caseListMap}
              selectCaseIdsSet={selectCaseIdsSet}
              setSelectCaseIdsSet={setSelectCaseIdsSet}
              ignoreTestDetailIdsSet={ignoreTestDetailIdsSet}
              allCaseIds={treeType === 'plan' ? planLinkCaseIds : allCaseIds}
              disabledIdsSet={disabledIdsSet}
              setCurrent={setCurrent}
              current={current}
              isPlanForTestSet={isPlanForTestSet}
              testSetId={caseSetId}
              groupCounts={groupCounts}
              validateCaseStatus={validateCaseStatus}
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
TestDetailsSelectorList.displayName = 'TestDetailsSelectorList';
export default React.memo(TestDetailsSelectorList);
