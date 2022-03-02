import React from 'react';
import { message } from '@osui/ui';
import { usePageContext } from '../hook';
import { TestRelationType } from '@/lib/constants';
import { actionConfirm } from '@/lib/utils/helper';
import { StatusBadge } from '@/components/common/Status';
import TableSelection from '@/components/common/BusinessTable/TableSelection';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';

const DetailTable = () => {
  const actionRef = React.useRef<BusinessTableActionType>();
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
    async queryParams => {
      if (!selectedTestPlanId) return null;
      const [{ list: testDetails, total }, { list: testRuns }] = await Promise.all([
        getTestEntitiesByRelation(
          TestRelationType.PlanRelDetail,
          { from: selectedTestPlanId },
          {
            workspaceKey,
            fillItemData: true,
            queryParams: queryParams,
            nameLike: searchValue,
          },
        ),
        getTestEntitiesByRelation(
          TestRelationType.PlanRelExecution,
          { from: selectedTestPlanId },
          {
            fillItemData: true,
            queryParams: { limit: 999 },
            include: ['objectId'],
            async resultTransfer(data) {
              const testExecutionIds = data.list.map(item => item.objectId);
              const { list: testRuns } = await getTestEntitiesByRelation(
                TestRelationType.ExecutionRelRun,
                {
                  from: testExecutionIds,
                },
                {
                  include: ['objectId'],
                  queryParams: { limit: 999 },
                },
              );
              return {
                ...data,
                list: testRuns.map(run => ({
                  ...run,
                  // 关联的 relations
                  relExecutions: data.list.filter(
                    item => item.objectId === run.relation.from.objectId,
                  ),
                })),
              };
            },
          },
        ),
      ]);

      const list = testDetails.map(detail => {
        return {
          ...detail,
          // 关联的测试执行
          relRuns: testRuns.filter(run => run.runReferenceDetail.objectId === detail.objectId),
        };
      });

      return {
        list,
        total,
      };
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

  const columns = [
    {
      width: 160,
      key: 'title',
      isSystem: true,
      title: '标题',
      render(_, rowData) {
        return rowData.reference.name;
      },
    },
    {
      key: 'assignee',
      title: '负责人',
      width: 140,
      render(_, rowData) {
        return <span data-value={rowData.reference.values.assignee}></span>;
      },
    },
    {
      key: 'latestStatus',
      title: '最新执行状态',
      width: 100,
      render(_, rowData) {
        return <StatusBadge readonly status={rowData.status} />;
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
      isSystem: true,
      title: '操作',
      fixed: 'right' as any,
      render(_, rowData) {
        return (
          <a
            onClick={() =>
              actionConfirm('该操作会将该测试用例从测试计划中删除，是否继续操作？', () => {
                removeTestRelation([rowData.relation.objectId]);
              })
            }
          >
            删除
          </a>
        );
      },
    },
  ];

  return (
    <BusinessTable
      rowKey="objectId"
      columns={columns}
      actionRef={actionRef}
      getDataSource={tableDataGetter}
      renderSelectionActionHeader={renderSelectionActionHeader}
    />
  );
};

export default DetailTable;
