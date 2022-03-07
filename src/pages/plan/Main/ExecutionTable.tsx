import React from 'react';
import { message } from '@osui/ui';
import { usePageContext } from '../hook';
import { updateTestRun } from '@/lib/api/runs';
import { TestRelationType } from '@/lib/constants';
import { UserCell } from '@projectproxima/components';
import { DeleteOutlined, UserOutlined } from '@/icons';
import { updateItemAssignee } from '@/lib/api/proxima';
import { StatusBadge } from '@/components/common/Status';
import TestRunModal from '@/components/panel/TestRunModal';
import { StatusProgress } from '@/components/common/Status';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { actionConfirm, goToItemDetailPage } from '@/lib/utils/helper';
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
                queryParams: { limit: 9999 },
                include: ['runReferenceDetail.reference'],
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

      message.success(`${relationTypeIds.length} 个测试执行从测试计划中移除`);
    },
    [refreshAndMutateData],
  );

  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      actionConfirm('该操作会将所选测试执行任务从测试计划中移除，是否继续操作？', () => {
        removeTestRelation(actionRef.current.selectedRows.map(row => row.relation.objectId));
      });
    };

    // 更新负责人
    const handleAssigneeChange = async assignees => {
      const itemIds = actionRef.current.selectedRows.map(row => row.reference.objectId);
      console.info('itemDataList', itemIds);
      await updateItemAssignee(itemIds, assignees);

      refreshAndMutateData();

      message.success(`${itemIds.length} 个测试负责人已更新`);
    };

    return [
      <UserCell
        key="assignee"
        mode="multiple"
        readonly={false}
        onChange={handleAssigneeChange}
        emptyChild={
          <a>
            <UserOutlined /> 负责人
          </a>
        }
      />,

      <a key="delete" onClick={handleDelete}>
        <DeleteOutlined /> 移除
      </a>,
    ];
  }, [refreshAndMutateData, removeTestRelation]);

  const columnsProp = [
    {
      width: 160,
      key: 'title',
      title: '标题',
      isSystem: true,
      render(_, rowData) {
        const itemData = rowData.reference ?? {};
        return (
          <span
            onClick={() =>
              goToItemDetailPage({
                workspaceKey: itemData.workspace?.key,
                itemKey: itemData.key,
              })
            }
          >
            {itemData.name}
          </span>
        );
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
      key: 'action',
      title: <span>操作</span>,
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
                actionConfirm('该操作会将该测试执行任务从测试计划中移除，是否继续操作？', () => {
                  removeTestRelation([rowData.relation.objectId]);
                })
              }
            >
              移除
            </a>
            <a onClick={() => alert('TODO: 添加用例')}>添加用例</a>
          </>
        );
      },
    },
  ];

  const expandedRowRender = React.useCallback(
    record => {
      // 测试执行序列
      const testIdSequence = record.relRuns?.map(item => item?.objectId).filter(Boolean);
      const handleTestRunStatusChange = async (testRunId, status) => {
        await updateTestRun(testRunId, { status: status.key });
        refreshAndMutateData();
      };

      const columns = [
        {
          key: 'detailName',
          title: '用例标题',
          isSystem: true,
          fixed: true,
          width: 160,
          tooltip: true,
          render(_, record) {
            const name = record.runReferenceDetail?.reference?.name ?? (
              <span style={{ color: '#ccc', fontSize: 12 }}>当前测试用例已被删除</span>
            );
            return <OverflowTooltip title={name}>{name}</OverflowTooltip>;
          },
        },
        {
          key: 'runStatus',
          title: '用例执行状态',
          width: 150,
          render(_, record) {
            return (
              <StatusBadge
                status={record.status}
                onStatusChange={status => handleTestRunStatusChange(record.objectId, status)}
              />
            );
          },
        },
        {
          key: 'action',
          title: '操作',
          isSystem: true,
          fixed: 'right' as any,
          render(_, record) {
            return (
              <TestRunModal
                testId={record.objectId}
                testIdSequence={testIdSequence}
                onCancel={() =>
                  setTimeout(() => {
                    refreshAndMutateData(); //刷新依赖数据
                  }, 200)
                }
                trigger={<a>执行</a>}
              />
            );
          },
        },
      ];
      return (
        <BusinessTable
          rowKey="objectId"
          columns={columns}
          useColumnSetting
          showPagination={false}
          name="ExecutionInnerTable"
          dataSource={record.relRuns}
          itemKey="runReferenceDetail.reference"
        />
      );
    },
    [refreshAndMutateData],
  );

  return (
    <BusinessTable
      useColumnSetting
      rowKey="objectId"
      itemKey="reference"
      name="ExecutionTable"
      columns={columnsProp}
      actionRef={actionRef}
      expandable={{
        expandedRowRender,
        expandRowByClick: true,
        rowExpandable: record => Boolean(record.relRuns.length),
      }}
      getDataSource={tableDataGetter}
      selectionActionNodes={selectionActionNodes}
      onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
    />
  );
};

export default ExecutionTable;
