import React from 'react';
import { notification } from '@osui/ui';
import { DeleteOutlined } from '@/icons';
import { usePageContext } from '../hook';
import { updateTestRun } from '@/lib/api/runs';
import { deleteItems } from '@/lib/api/proxima';
import { StatusBadge } from '@/components/business/Status';
import { TestRelationType, TestType } from '@/lib/constants';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { StatusProgress } from '@/components/business/Status';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import { addTestDetailToExecution, updateTestRunStatus } from '@/lib/api/runs';
import {
  deleteTestEntities,
  removeTestRelations,
  getTestEntitiesByRelation,
} from '@/lib/api/common';

import BusinessTable, {
  ActionType as BusinessTableActionRef,
} from '@/components/common/BusinessTable/BusinessTable';
import TestEntitySelectorModal, {
  ActionType as TestEntitySelectorActionType,
} from '@/components/business/TestEntitySelectorModal';

import ExpandedTable from './ExpandedTable';

const ExecutionTable = () => {
  const innerTableRef = React.useRef<BusinessTableActionRef>();
  const executionTableActionRef = React.useRef<BusinessTableActionRef>();
  const testEntitySelectorRef = React.useRef<TestEntitySelectorActionType>();

  // 事项数据更新后刷新列表
  useListener('updateItemList', () => {
    setTimeout(() => {
      innerTableRef.current.refresh();
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

  const refreshAndMutateData = React.useCallback(() => {
    executionTableActionRef.current.refresh();
    mutateTestPlanEvent.emit(selectedTestPlanId);
  }, [mutateTestPlanEvent, selectedTestPlanId]);

  tableSelectionToggleEvent.useSubscription(visible => {
    innerTableRef.current?.toggleSelection(visible);
  });

  React.useEffect(() => {
    if (selectedTestPlanId) {
      executionTableActionRef.current.refresh();
    }
  }, [searchValue, selectedTestPlanId]);

  const tableDataGetter = React.useCallback(
    queryParams => {
      return getTestEntitiesByRelation(
        TestRelationType.PlanRelExecution,
        { from: selectedTestPlanId },
        {
          workspaceKey,
          nameLike: searchValue,
          include: ['reference'],
          queryParams: queryParams,
          async resultTransfer({ list, total }) {
            const testExecutionIds = list.map(item => item.objectId);

            const { list: testRuns } = await getTestEntitiesByRelation(
              TestRelationType.ExecutionRelRun,
              {
                from: testExecutionIds,
              },
              {
                queryParams: { limit: 9999 },
                select: ['status', 'runReferenceDetail.reference'],
                include: ['status', 'runReferenceDetail.reference'],
              },
            );

            return {
              total,
              list: list.map(execution => ({
                ...execution,
                relRuns: testRuns.filter(
                  run =>
                    run.relation.from.objectId === execution.objectId &&
                    run.runReferenceDetail?.reference,
                ),
              })),
            };
          },
        },
      );
    },
    [searchValue, selectedTestPlanId, workspaceKey],
  );

  const removeTestRelation = React.useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;
      await removeTestRelations(relationTypeIds);

      refreshAndMutateData();

      notification.success({
        message: `${relationTypeIds.length} 个测试执行从测试计划中移除`,
      });
    },
    [refreshAndMutateData],
  );

  const InnerTableSelectionActionNodes = React.useMemo(() => {
    const deleteTestRun = () => {
      const selectedRows = innerTableRef.current.selectedRows;
      actionConfirm('该操作会将所选测试执行删除，是否继续操作？', () => {
        // 删除关联关系，删除测试实体
        deleteTestEntities(selectedRows.map(row => row.objectId));
        removeTestRelation(selectedRows.map(row => row.relation.objectId));
      });
    };

    const toggleSTestRunStatus = async status => {
      const selectedRows = innerTableRef.current.selectedRows;
      const testRunIds = selectedRows.map(item => item.objectId);
      await updateTestRunStatus({
        status: status.key,
        testRun: testRunIds,
      });
      notification.success({
        message: '所选测试执行状态更新成功',
      });
      refreshAndMutateData();
    };

    return [
      <StatusBadge
        useRootContainer
        onStatusChange={toggleSTestRunStatus}
        key="toggleRunStatus"
        emptyNode={
          <span>
            <DeleteOutlined /> 设置状态
          </span>
        }
      />,

      <span key="delete" onClick={deleteTestRun}>
        <DeleteOutlined /> 删除
      </span>,
    ];
  }, [refreshAndMutateData, removeTestRelation]);

  const addTestDetail = async rowData => {
    const ignoreTestDetailIds = rowData.relRuns
      .map(run => run.runReferenceDetail?.objectId)
      .filter(Boolean);

    const testDetailIds = await testEntitySelectorRef.current.open({
      ignoreTestEntityIds: ignoreTestDetailIds,
    });

    await addTestDetailToExecution({
      testDetail: testDetailIds,
      testPlan: selectedTestPlanId,
      testExecution: rowData.objectId,
      workspaceKey: rowData.workspaceKey,
    });

    refreshAndMutateData();
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
        InnerTableSelectionActionNodes={InnerTableSelectionActionNodes}
        refreshAndMutateData={refreshAndMutateData}
        tableSelectionToggleEvent={tableSelectionToggleEvent}
        record={record}
        updateTestRun={updateTestRun}
        openItemViewScreen={openItemViewScreen}
        innerTableRef={innerTableRef}
      />
    ),
    [InnerTableSelectionActionNodes, refreshAndMutateData, tableSelectionToggleEvent],
  );

  return (
    <>
      <TestEntitySelectorModal
        title="添加测试用例"
        testType={TestType.TestDetail}
        actionRef={testEntitySelectorRef}
      />
      <BusinessTable
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
