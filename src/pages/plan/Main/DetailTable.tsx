import React from 'react';
import { notification } from '@osui/ui';
import { usePageContext } from '../hook';
import { TestRelationType } from '@/lib/constants';
import { UserCell } from '@projectproxima/components';
import { updateItemAssignee } from '@/lib/api/proxima';
import { DeleteOutlined, UserOutlined } from '@/icons';
import { StatusBadge } from '@/components/business/Status';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';

import cx from './DetailTable.less';

const DetailTable = () => {
  const actionRef = React.useRef<BusinessTableActionType>();

  // 事项数据更新后刷新列表
  useListener('updateItemList', () => {
    setTimeout(() => {
      actionRef.current.refresh();
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

  const refreshAndMutateData = React.useCallback(() => {
    actionRef.current.propsOnChange({ current: 1 });
    actionRef.current.refresh();
    mutateTestPlanEvent.emit(undefined);
  }, [mutateTestPlanEvent]);

  const [isCheck, setIsCheck] = React.useState(false);

  React.useEffect(() => {
    registerRefreshMethod({
      detailTable: actionRef.current?.refresh,
    });
  }, [registerRefreshMethod]);

  tableSelectionToggleEvent.useSubscription(visible => {
    actionRef.current.toggleSelection(visible);
  });

  React.useEffect(() => {
    if (selectedTestPlanId) {
      actionRef.current.refresh();
    }
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
            nameLike: searchValue,
            queryParams: queryParams,
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
          relRuns: testRuns.filter(run => run.runReferenceDetail?.objectId === detail.objectId),
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

      notification.success({
        message: `${relationTypeIds.length} 个测试用例从测试计划中移除`,
      });
    },
    [refreshAndMutateData],
  );

  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      if (isCheck) {
        actionConfirm('该操作会将所选测试用例从测试计划中移除，是否继续操作？', () => {
          removeTestRelation(actionRef.current.selectedRows.map(row => row.relation.objectId));
        });
      }
    };

    // 更新负责人
    const handleAssigneeChange = async assignees => {
      const itemIds = actionRef.current.selectedRows.map(row => row.reference.objectId);
      await updateItemAssignee(itemIds, assignees);

      setTimeout(() => {
        refreshAndMutateData();
      }, 1000);

      notification.success({
        message: `${itemIds.length} 个测试负责人已更新`,
      });
    };

    return [
      <UserCell
        key="assignee"
        mode="multiple"
        readonly={!isCheck}
        onChange={handleAssigneeChange}
        emptyChild={
          <span>
            <UserOutlined /> 设置负责人
          </span>
        }
      />,

      <span key="delete" onClick={handleDelete}>
        <DeleteOutlined /> 移除
      </span>,
    ];
  }, [refreshAndMutateData, removeTestRelation, isCheck]);

  const columns = [
    {
      width: 320,
      key: 'title',
      isSystem: true,
      title: '标题',
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
      key: 'latestStatus',
      title: '最新执行状态',
      width: 200,
      render(_, rowData) {
        return <StatusBadge readonly status={rowData.status} className={cx('cell-min')} />;
      },
    },
    {
      key: 'times',
      title: <span>执行任务次数</span>,
      width: 200,
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
              actionConfirm('该操作会将该测试用例从测试计划中移除，是否继续操作？', () => {
                removeTestRelation([rowData.relation.objectId]);
              })
            }
          >
            移除
          </a>
        );
      },
    },
  ];

  return (
    <BusinessTable
      useColumnSetting
      rowKey="objectId"
      columns={columns}
      name="DetailTable"
      actionRef={actionRef}
      getDataSource={tableDataGetter}
      setIsCheck={setIsCheck}
      isCheck={isCheck}
      selectionActionNodes={selectionActionNodes}
      onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
    />
  );
};

export default DetailTable;
