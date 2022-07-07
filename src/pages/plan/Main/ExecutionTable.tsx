import React from 'react';
import { notification } from 'antd';
import { usePageContext } from '../hook';
import { updateTestRun } from '@/lib/api/runs';
import { deleteItems } from '@/lib/api/proxima';
import { TestRelationType, TestType } from '@/lib/constants';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { StatusProgress } from '@/components/business/Status';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import { addTestDetailToExecution } from '@/lib/api/runs';
import { isEmpty } from 'lodash';
import {
  deleteTestEntities,
  removeTestRelations,
  getTestEntitiesByRelation,
  fetchItemFromIql,
} from '@/lib/api/common';
import { useTestConfig } from '@/lib/hooks/useContext';
import BusinessTable, {
  ActionType as BusinessTableActionRef,
} from '@/components/common/BusinessTable/BusinessTable';
import TestEntitySelectorModal, {
  ActionType as TestEntitySelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { Item, Test } from '@/lib/models';
import { selectorToParse } from '@/lib/utils/iql';

import ExpandedTable from './ExpandedTable';

const ExecutionTable = () => {
  const innerTableRefs = React.useRef<Record<string, BusinessTableActionRef>>({});
  const executionTableActionRef = React.useRef<BusinessTableActionRef>();
  const testEntitySelectorRef = React.useRef<TestEntitySelectorActionType>();
  const [ignoreTestEntityIds, setIgnoreTestEntityIds] = React.useState([]);
  const { workspace } = useTestConfig();

  // 事项数据更新后刷新列表
  useListener('updateItemList', () => {
    setTimeout(() => {
      Object.values(innerTableRefs.current).forEach(ref => {
        ref?.refresh();
      });
      executionTableActionRef.current.refresh();
    }, 400);
  });

  const {
    searchValue,
    selectors,
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

  const refreshAndMutateData = React.useCallback(() => {
    Object.values(innerTableRefs.current).forEach(ref => {
      ref?.expandChangePage(1);
    });
    executionTableActionRef.current.refresh();
    mutateTestPlanEvent.emit(selectedTestPlanId);
  }, [mutateTestPlanEvent, selectedTestPlanId]);

  tableSelectionToggleEvent.useSubscription(visible => {
    Object.values(innerTableRefs.current).forEach(ref => {
      ref?.toggleSelection(visible);
    });
  });

  React.useEffect(() => {
    if (selectedTestPlanId) {
      executionTableActionRef.current.refresh();
    }
  }, [searchValue, selectors, selectedTestPlanId]);

  const tableDataGetter = React.useCallback(
    async queryParams => {
      // 没有获取到时候，不要触发查询
      if (!workspace) {
        return { total: 0, list: [] };
      }
      return getTestEntitiesByRelation(
        TestRelationType.PlanRelExecution,
        { from: selectedTestPlanId },
        {
          nameLike: searchValue,
          select: ['reference'],
          include: ['reference'],
          workspace,
          queryParams: queryParams,
          async resultTransfer({ list }) {
            const testExecutionIds = list.map(item => item.objectId);

            // 测试执行
            const { list: testRuns } = await getTestEntitiesByRelation(
              TestRelationType.ExecutionRelRun,
              {
                from: testExecutionIds,
              },
              {
                workspace,
                queryParams: { limit: 9999 },
                select: ['status', 'sortIndex', 'runReferenceDetail', 'executor'],
                include: ['status', 'sortIndex', 'runReferenceDetail', 'executor'],
                parseMiddleware: async query => {
                  const testQuery = new Parse.Query(Test);
                  const [itemSelector, testManageSelector] = [selectors?.[0], selectors?.[1]];
                  let needUpdate = false;
                  if (!isEmpty(itemSelector)) {
                    const ids = await fetchItemFromIql(itemSelector, workspace);
                    needUpdate = true;
                    if (ids?.length) {
                      testQuery.containedIn(
                        'reference',
                        ids.map(id => Item.createWithoutData(id)),
                      );
                    } else {
                      testQuery.doesNotExist('reference');
                    }
                  }
                  if (!isEmpty(testManageSelector)) {
                    needUpdate = true;
                    selectorToParse(testQuery, testManageSelector);
                  }
                  if (needUpdate) {
                    query.matchesQuery(
                      'to',
                      new Parse.Query(Test).matchesQuery('runReferenceDetail', testQuery),
                    );
                  }
                },
              },
            );

            return {
              total: testRuns?.length,
              list: list.map(execution => ({
                ...execution,
                relRuns: testRuns
                  .filter(
                    run =>
                      run.relation.from.objectId === execution.objectId &&
                      run.runReferenceDetail?.reference,
                  )
                  .sort(
                    (a, b) =>
                      a.sortIndex - b.sortIndex ||
                      Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)),
                  ),
              })),
            };
          },
        },
      );
    },
    [searchValue, selectedTestPlanId, selectors, workspace],
  );

  const removeTestRelation = React.useCallback(
    async (relationTypeIds, options = {}) => {
      if (!Array.isArray(relationTypeIds)) return;
      await removeTestRelations(relationTypeIds);

      refreshAndMutateData();

      notification.success({
        message: options?.message ?? `${relationTypeIds.length} 个测试执行从测试计划中移除`,
      });

      Object.values(innerTableRefs.current).forEach((res: any) => {
        res.resetSelectedRows();
      });
    },
    [refreshAndMutateData, innerTableRefs],
  );

  const addTestDetail = async rowData => {
    const ignoreTestDetailIds = rowData.relRuns
      .map(run => run.runReferenceDetail?.objectId)
      .filter(Boolean);

    setIgnoreTestEntityIds(ignoreTestDetailIds);

    const testDetailIds = await testEntitySelectorRef.current.open();

    // 去重
    const newTestDetailIds = testDetailIds.filter(d => !ignoreTestDetailIds.includes(d));

    await addTestDetailToExecution({
      testDetail: newTestDetailIds,
      testPlan: selectedTestPlanId,
      testExecution: rowData.objectId,
      workspaceKey: rowData.workspaceKey,
    });

    refreshAndMutateData();
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
                actionConfirm('该操作会将该测试执行任务删除，是否继续操作？', () => {
                  deleteTestEntities([rowData.objectId]);
                  deleteItems([rowData.reference.objectId]);
                  removeTestRelation([rowData.relation.objectId]);
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
        innerTableRefs={innerTableRefs}
        removeTestRelation={removeTestRelation}
        refreshAndMutateData={refreshAndMutateData}
        tableSelectionToggleEvent={tableSelectionToggleEvent}
        record={record}
        updateTestRun={updateTestRun}
        openItemViewScreen={openItemViewScreen}
        innerTableRef={ref =>
          (innerTableRefs.current = { ...innerTableRefs.current, [record.objectId]: ref })
        }
      />
    ),
    [refreshAndMutateData, removeTestRelation, tableSelectionToggleEvent, workspaceKey],
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
