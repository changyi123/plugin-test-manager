import React from 'react';
import { message } from '@osui/ui';
import { usePageContext } from '../hook';
import { TestRelationType } from '@/lib/constants';
import { actionConfirm } from '@/lib/utils/helper';
import { StatusProgress } from '@/components/common/Status';
import TableSelection from '@/components/common/BusinessTable/TableSelection';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';
import BusinessTable, { ActionType } from '@/components/common/BusinessTable/BusinessTable';

const ExecutionTable = () => {
  const actionRef = React.useRef<ActionType>();
  const {
    searchValue,
    workspaceKey,
    selectedTestPlanId,
    mutateTestPlanEvent,
    tableSelectionToggleEvent,
  } = usePageContext();

  const refreshAndMutateData = React.useCallback(() => {
    actionRef.current.refresh();
    mutateTestPlanEvent.emit(selectedTestPlanId);
  }, [mutateTestPlanEvent, selectedTestPlanId]);

  tableSelectionToggleEvent.useSubscription(visible => {
    actionRef.current.toggleSelection(visible);
  });

  React.useEffect(() => {
    actionRef.current.refresh();
  }, [searchValue, selectedTestPlanId]);

  const tableDataGetter = React.useCallback(
    queryParams => {
      return getTestEntitiesByRelation(
        TestRelationType.PlanRelExecution,
        { from: selectedTestPlanId },
        {
          workspaceKey,
          fillItemData: true,
          nameLike: searchValue,
          queryParams: queryParams,
          async resultTransfer({ list, total }) {
            const testExecutionIds = list.map(item => item.objectId);
            const { list: testRuns } = await getTestEntitiesByRelation(
              TestRelationType.ExecutionRelRun,
              {
                from: testExecutionIds,
              },
              {
                limit: 9999,
              },
            );

            return {
              total,
              list: list.map(execution => ({
                ...execution,
                relRuns: testRuns.filter(run => run.relation.from.objectId === execution.objectId),
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

      message.success(`${relationTypeIds.length} 个测试执行从测试计划中删除`);
    },
    [refreshAndMutateData],
  );

  const handleDelete = rows => {
    actionConfirm('该操作会将所选测试用例从测试计划中删除，是否继续操作？', () => {
      removeTestRelation(rows.map(row => row.relation.objectId));
    });
  };

  const renderSelectionActionHeader = ({ selectedRows, toggleSelection, toggleAllRowsChecked }) => {
    const handleToggleSelection = visible => {
      toggleSelection(visible);
      tableSelectionToggleEvent.emit(visible);
    };

    return (
      <TableSelection
        onDelete={handleDelete}
        selectedRows={selectedRows}
        toggleSelection={handleToggleSelection}
        toggleAllRowsChecked={toggleAllRowsChecked}
      />
    );
  };

  const columnsProp = [
    {
      width: 160,
      key: 'title',
      title: '标题',
      render(_, rowData) {
        return rowData.reference.name;
      },
    },
    {
      width: 100,
      key: 'detailNum',
      title: '测试用例数',
      render(_, rowData) {
        return rowData.relRuns.length;
      },
    },
    {
      width: 160,
      key: 'runStatuses',
      overflowEllipsis: false,
      title: '测试执行状态',
      render(_, rowData) {
        const statuses = rowData.relRuns.map(run => run.status);
        return <StatusProgress hasSummary statuses={statuses} />;
      },
    },
    {
      key: 'times',
      title: <span>执行任务次数</span>,
      width: 100,
      render(_, rowData) {
        return rowData.relRuns.length;
      },
    },
    {
      key: 'action',
      title: '操作',
      fixed: 'right' as any,
      render(_, rowData) {
        return (
          <>
            <a
              onClick={() =>
                actionConfirm('该操作会将该测试用例从测试计划中删除，是否继续操作？', () => {
                  removeTestRelation([rowData.relation.objectId]);
                })
              }
            >
              删除
            </a>
            <a onClick={() => console.info(11)}>添加用例</a>
          </>
        );
      },
    },
  ];

  return (
    <BusinessTable
      rowKey="objectId"
      columns={columnsProp}
      actionRef={actionRef}
      getDataSource={tableDataGetter}
      renderSelectionActionHeader={renderSelectionActionHeader}
    />
  );
};

export default ExecutionTable;
