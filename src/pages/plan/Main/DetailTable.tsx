import React from 'react';
import { notification } from 'antd';
import { usePageContext } from '../hook';
import { TestRelationType } from '@/lib/constants';
import { UserCell } from '@projectproxima/components';
import { updateItemAssignee } from '@/lib/api/proxima';
import { DeleteOutlined, UserOutlined } from '@/icons';
import { StatusBadge } from '@/components/business/Status';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import {
  getTestEntitiesByRelation,
  removeTestRelationsWithCondition,
  getTestEntitiesByRelationWithOrder,
} from '@/lib/api/common';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';

import cx from './DetailTable.less';
import RepositoryGroup from '@/components/business/RepositoryGroup';

const DetailTable = () => {
  const actionRef = React.useRef<BusinessTableActionType>();
  const [tableLoading, setTableLoading] = React.useState(false);

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

  const userData = useUserCellUserDataProp(workspaceKey);

  const selectedTestPlanId = selectedTestPlan?.objectId;

  const refreshAndMutateData = React.useCallback(() => {
    actionRef.current.refresh();
    mutateTestPlanEvent.emit(selectedTestPlanId);
  }, [selectedTestPlanId, mutateTestPlanEvent]);

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
      setTableLoading(true);

      const [{ list: testDetails, total }, { list: testRuns }] = await Promise.all([
        getTestEntitiesByRelationWithOrder(
          TestRelationType.PlanRelDetail,
          { from: selectedTestPlanId },
          {
            include: ['repository'],
            select: ['type', 'sortIndex', 'reference', 'repository', 'workspaceKey', 'createdAt'],
            // FIXME: 优化查询速度
            workspaceKey,
            fillItemData: true,
            nameLike: searchValue,
            queryParams: queryParams,
          },
        ),
        getTestEntitiesByRelationWithOrder(
          TestRelationType.PlanRelExecution,
          { from: selectedTestPlanId },
          {
            // FIXME: 优化查询速度
            // workspaceKey,
            fillItemData: true,
            queryParams: { limit: 9999 },
            include: ['objectId'],
            select: ['objectId'],
            async resultTransfer(data) {
              const testExecutionIds = data.list.map(item => item.objectId);
              const { list: testRuns } = await getTestEntitiesByRelation(
                TestRelationType.ExecutionRelRun,
                {
                  from: testExecutionIds,
                },
                {
                  include: ['objectId'],
                  select: ['objectId', 'runReferenceDetail'],
                  queryParams: { limit: 9999 },
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
          selectedTestPlanId,
          relRuns: testRuns.filter(run => run.runReferenceDetail?.objectId === detail.objectId),
        };
      });
      setTableLoading(false);

      return {
        list,
        total,
      };
    },
    [searchValue, selectedTestPlanId, workspaceKey],
  );

  const removeTestRelation = React.useCallback(
    async (selectedTestPlanId, testDetailIds) => {
      if (!Array.isArray(testDetailIds)) return;
      await removeTestRelationsWithCondition(TestRelationType.PlanRelDetail, {
        from: selectedTestPlanId,
        to: testDetailIds,
      });

      refreshAndMutateData();

      notification.success({
        message: `${testDetailIds.length} 个测试用例从测试计划中移除`,
      });

      actionRef.current.resetSelectedRows();
    },
    [refreshAndMutateData, actionRef],
  );

  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      if (isCheck) {
        actionConfirm('该操作会将所选测试用例从测试计划中移除，是否继续操作？', () => {
          removeTestRelation(
            selectedTestPlanId,
            actionRef.current.selectedRows.map(row => row.objectId),
          );
        });
      }
    };

    // 更新负责人
    const handleAssigneeChange = async assignees => {
      setTableLoading(true);
      const itemIds = actionRef.current.selectedRows.map(row => row.reference.objectId);
      await updateItemAssignee(itemIds, assignees);

      setTimeout(() => {
        refreshAndMutateData();
      }, 1000);

      setTableLoading(false);
      notification.success({
        message: `${itemIds.length} 个测试负责人已更新`,
      });
    };

    return [
      <UserCell
        value={[]}
        key="assignee"
        mode="multiple"
        readonly={!isCheck}
        userData={userData}
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
  }, [isCheck, userData, removeTestRelation, selectedTestPlanId, refreshAndMutateData]);

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
      key: 'repositoryGroup',
      title: '所属模块',
      width: 240,
      render(_, rowData) {
        return <RepositoryGroup rowData={rowData}></RepositoryGroup>;
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
      width: 140,
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
                removeTestRelation(rowData.selectedTestPlanId, [rowData.objectId]);
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
      titleCellOption={{
        workspaceKey,
        testType: 'TestDetail',
      }}
      useColumnSetting
      defaultColumnKey={[
        'key',
        'repositoryGroup',
        'latestStatus',
        'times',
        'createdBy',
        'createdAt',
      ]}
      rowKey="objectId"
      columns={columns}
      isCheck={isCheck}
      name="DetailTable"
      actionRef={actionRef}
      loading={tableLoading}
      setIsCheck={setIsCheck}
      getDataSource={tableDataGetter}
      selectionActionNodes={selectionActionNodes}
      onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
    />
  );
};

export default DetailTable;
