import React from 'react';
import { notification } from 'antd';
import { usePageContext } from '../hook';
import { updateTestRun } from '@/lib/api/runs';
import { deleteItems } from '@/lib/api/proxima';
import { addTestDetailToExecution } from '@/lib/api/runs';
import { TestRelationType, TestType } from '@/lib/constants';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { StatusProgress } from '@/components/business/Status';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import {
  deleteTestEntities,
  getTestEntitiesByRelation,
  getTestEntitiesByRelationWithOrder,
} from '@/lib/api/common';

import BusinessTable, {
  ActionType as BusinessTableActionRef,
} from '@/components/common/BusinessTable/BusinessTable';
import TestEntitySelectorModal, {
  ActionType as TestEntitySelectorActionType,
} from '@/components/business/TestEntitySelectorModal';

import ExpandedTable from './ExpandedTable';

const ExecutionTable = () => {
  const innerTableRefs = React.useRef<
    Record<string, React.MutableRefObject<BusinessTableActionRef>>
  >({});
  const executionTableActionRef = React.useRef<BusinessTableActionRef>();
  const testEntitySelectorRef = React.useRef<TestEntitySelectorActionType>();
  const [ignoreTestEntityIds, setIgnoreTestEntityIds] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // 事项数据更新后刷新列表
  useListener('updateItemList', () => {
    setTimeout(() => {
      Object.values(innerTableRefs.current).forEach(ref => {
        ref?.current.refresh();
      });
      executionTableActionRef.current.refresh();
    }, 400);
  });

  const {
    searchValue,
    workspaceKey,
    selectedTestPlan,
    mutateTestPlanEvent,
    registerRefreshMethod,
    tableSelectionToggleEvent,
  } = usePageContext();

  const selectedTestPlanId = selectedTestPlan?.objectId;

  React.useEffect(() => {
    registerRefreshMethod({
      executionTable: executionTableActionRef.current?.refresh,
    });
  }, [registerRefreshMethod]);

  const refreshAndMutateData = React.useCallback(
    (options?: { shouldRestCurrentPage?: boolean; shouldRestSelectedRowKeys?: boolean }) => {
      // 是否需要重置当前页
      if (options?.shouldRestCurrentPage) {
        Object.values(innerTableRefs.current).forEach(ref => {
          ref?.current.expandChangePage(1);
        });
      }

      if (options?.shouldRestSelectedRowKeys) {
        Object.values(innerTableRefs.current).forEach(ref => {
          ref?.current.resetSelectedRowKeys();
        });
      }

      executionTableActionRef.current.refresh();
      mutateTestPlanEvent.emit(selectedTestPlanId);
    },
    [mutateTestPlanEvent, selectedTestPlanId],
  );

  tableSelectionToggleEvent.useSubscription(visible => {
    Object.values(innerTableRefs.current).forEach(ref => {
      ref?.current.resetSelectedRowKeys();
      ref?.current.toggleSelection(visible);
    });
  });

  React.useEffect(() => {
    if (selectedTestPlanId) {
      executionTableActionRef.current.refresh();
    }
  }, [searchValue, selectedTestPlanId]);

  const tableDataGetter = React.useCallback(
    async queryParams => {
      try {
        setLoading(true);
        return await getTestEntitiesByRelationWithOrder(
          TestRelationType.PlanRelExecution,
          { from: selectedTestPlanId },
          {
            // FIXME: 优化查询速度
            workspaceKey,
            nameLike: searchValue,
            include: ['reference'],
            select: ['reference', 'workspaceKey'],
            descendingBy: 'createdAt',
            queryParams: queryParams,
            async resultTransfer({ list, total }) {
              const testExecutionIds = list.map(item => item.objectId);

              console.time('PlanRelExecution-getTestEntitiesByRelation');
              const { list: testRuns } = await getTestEntitiesByRelation(
                TestRelationType.ExecutionRelRun,
                {
                  from: testExecutionIds,
                },
                {
                  // FIXME: 优化查询速度
                  workspaceKey,
                  queryParams: { limit: 9999 },
                  select: [
                    'status',
                    'sortIndex',
                    'runReferenceDetail.reference',
                    'runReferenceDetail.repository',
                    'executor',
                    'designee',
                  ],
                  include: [
                    'status',
                    'sortIndex',
                    'runReferenceDetail.reference',
                    'runReferenceDetail.repository',
                    'executor',
                    'designee',
                  ],
                },
              );
              console.timeEnd('PlanRelExecution-getTestEntitiesByRelation');
              const testRunMap = testRuns
                // 过滤测试用例事项已被删除的执行
                .filter(run => run.runReferenceDetail?.reference)
                // 对测试用例进行排序
                .sort(
                  (a, b) =>
                    a.sortIndex - b.sortIndex ||
                    Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)),
                )
                .reduce((map, run) => {
                  const key = run.relation.from.objectId;
                  const storeTestRuns = map.get(key) ?? [];
                  map.set(key, storeTestRuns.concat(run));
                  return map;
                }, new Map());

              const result = {
                total,
                list: list.map(execution => ({
                  ...execution,
                  relRuns: testRunMap.get(execution.objectId) ?? [],
                })),
              };
              return result;
            },
          },
        );
      } finally {
        setLoading(false);
      }
    },
    [searchValue, selectedTestPlanId, workspaceKey],
  );

  const addTestDetail = async rowData => {
    const ignoreTestDetailIds = rowData.relRuns
      .map(run => run.runReferenceDetail?.objectId)
      .filter(Boolean);

    setIgnoreTestEntityIds(ignoreTestDetailIds);

    const testDetailIds = await testEntitySelectorRef.current.open();

    // 去重
    const newTestDetailIds = testDetailIds.filter(d => !ignoreTestDetailIds.includes(d));
    setLoading(true);

    await addTestDetailToExecution({
      testDetail: newTestDetailIds,
      testPlan: selectedTestPlanId,
      testExecution: rowData.objectId,
      workspaceKey: rowData.workspaceKey,
    });

    refreshAndMutateData();
    setLoading(false);
    setIgnoreTestEntityIds([]);
    notification.success({
      message: '测试执行创建成功',
    });
  };

  const columnsProp = [
    {
      width: 160,
      key: 'title',
      title: '标题',
      isSystem: true,
      render(_, rowData) {
        const itemData = rowData.reference ?? {};
        return (
          <span style={{ cursor: 'pointer' }} onClick={() => openItemViewScreen(itemData.objectId)}>
            {itemData.name}
          </span>
        );
      },
    },
    {
      width: 180,
      key: 'detailNum',
      title: '测试用例数',
      render(_, rowData) {
        return rowData.relRuns.length;
      },
    },
    {
      width: 180,
      key: 'runStatuses',
      overflowEllipsis: false,
      title: '测试执行状态',
      render(_, rowData) {
        const statuses = rowData.relRuns.map(run => run.status);
        return <StatusProgress hasSummary statuses={statuses} />;
      },
    },
    {
      key: 'action',
      title: '操作',
      fixed: 'right' as any,
      isSystem: true,
      render(_, rowData) {
        return (
          <>
            <a
              style={{
                marginRight: 8,
              }}
              onClick={() =>
                actionConfirm('该操作会将该测试执行任务删除，是否继续操作？', async () => {
                  await Promise.all([
                    deleteTestEntities([rowData.objectId]),
                    deleteItems([rowData.reference.objectId]),
                  ]);
                  refreshAndMutateData();
                })
              }
            >
              删除
            </a>
            <a onClick={() => addTestDetail(rowData)}>添加用例</a>
          </>
        );
      },
    },
  ];

  const expandedRowRender = React.useCallback(
    record => (
      <ExpandedTable
        titleCellOption={{
          workspaceKey,
          testType: 'TestDetail',
        }}
        record={record}
        updateTestRun={updateTestRun}
        refreshAndMutateData={refreshAndMutateData}
        openItemViewScreen={openItemViewScreen}
        tableSelectionToggleEvent={tableSelectionToggleEvent}
        innerTableRef={ref =>
          (innerTableRefs.current = { ...innerTableRefs.current, [record.objectId]: ref })
        }
      />
    ),
    [refreshAndMutateData, tableSelectionToggleEvent, workspaceKey],
  );

  return (
    <>
      <TestEntitySelectorModal
        title="添加测试用例"
        testType={TestType.TestDetail}
        actionRef={testEntitySelectorRef}
        ignoreTestEntityIds={ignoreTestEntityIds}
      />
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: 'TestExecution',
        }}
        loading={loading}
        useColumnSetting
        rowKey="objectId"
        itemKey="reference"
        name="ExecutionTable"
        columns={columnsProp}
        expandable={{
          expandedRowRender,
          expandRowByClick: true,
        }}
        getDataSource={tableDataGetter}
        actionRef={executionTableActionRef}
      />
    </>
  );
};

export default ExecutionTable;
