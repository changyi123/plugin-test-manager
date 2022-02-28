import React from 'react';
import { usePageContext } from '../hook';
import TableSelection from './TableSelection';
import { TestRelationType } from '@/lib/constants';
import { getTestEntitiesByRelation } from '@/lib/api/common';
import BusinessTable, { ActionType, Column } from '@/components/common/BusinessTable';

const DetailTable = () => {
  const actionRef = React.useRef<ActionType>();
  const { tableActionEvent, selectedTestPlanId, searchValue, workspaceKey } = usePageContext();

  tableActionEvent.useSubscription(event => {
    if (typeof event.tableSelectionVisible === 'boolean') {
      actionRef.current.toggleSelection(event.tableSelectionVisible);
    }
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

  const handleDelete = ids => {
    console.log(ids);
  };

  const renderSelectionActionHeader = ({ selectedRowKeys, toggleAllRowsChecked }) => {
    return (
      <TableSelection
        indeterminate={false}
        onDelete={handleDelete}
        selectedRowKeys={selectedRowKeys}
        toggleAllRowsChecked={toggleAllRowsChecked}
      />
    );
  };

  const columnsProp = [
    {
      width: 160,
      key: 'title',
      title: '标题',
      frozen: Column.FrozenDirection.LEFT,
      dataGetter({ rowData }) {
        return rowData.reference.name;
      },
    },
    {
      key: 'test',
      title: 'test',
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

export default DetailTable;
