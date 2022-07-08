import React, { useCallback, useState } from 'react';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import {
  deleteTestEntities,
  getTestEntitiesByQuery,
  getTestEntitiesByRelation,
  getTestEntitiesByRelationWithOrder,
  removeTestRelationsWithCondition,
} from '@/lib/api/common';
import { TestRelationType, TestType } from '@/lib/constants';

import cx from './index.less';
import Field from '@/components/common/Field';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import RepositoryGroup from '@/components/business/RepositoryGroup';
import { StatusBadge } from '@/components/business/Status';
import { notification } from 'antd';
import { updateTestRun } from '@/lib/api/runs';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { useMemoizedFn } from 'ahooks';
import { usePageContext } from '../hook';
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { updateItemAssignee } from '@/lib/api/proxima';
import { UserCell } from '@projectproxima/components';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';

interface TestEntityListProps {
  allTestDetailIds: string[];
  currentTestEntityIds?: string[];
  activedType: string;
  allTestDetailIdsRefresh: () => void;
}

const TestEntityList: React.FC<TestEntityListProps> = ({
  activedType,
  allTestDetailIds,
  currentTestEntityIds,
  allTestDetailIdsRefresh,
}) => {
  const {
    workspaceKey,
    searchValue,
    selectedTestPlan,
    registerRefreshMethod,
    mutateTestPlanEvent,
    tableSelectionToggleEvent,
  } = usePageContext();
  const actionRef = React.useRef<BusinessTableActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();
  const userData = useUserCellUserDataProp(workspaceKey);

  const [tableLoading, setTableLoading] = useState(false);
  const [hasRowSelected, setHasRowSelected] = useState(false);

  React.useEffect(() => {
    registerRefreshMethod({
      detailTable: actionRef.current?.refresh,
    });
  }, [registerRefreshMethod]);

  const tableDataGetter = useCallback(
    async queryParams => {
      setTableLoading(true);
      const testType = activedType === 'testPlan' ? TestType.TestDetail : TestType.TestRun;
      const include =
        activedType === 'testPlan'
          ? ['repository', 'reference']
          : [
              'runReferenceDetail.reference',
              'runReferenceDetail.repository',
              'executor',
              'designee',
            ];

      const select =
        activedType === 'testPlan'
          ? ['type', 'sortIndex', 'reference', 'repository', 'workspaceKey', 'createdAt']
          : [
              'status',
              'sortIndex',
              'runReferenceDetail.reference',
              'runReferenceDetail.repository',
              'executor',
              'designee',
            ];
      const ascendingBy = activedType === 'testPlan' ? ['sortIndex', 'createdAt'] : ['createdAt'];

      const { results: testDetails, count } = await getTestEntitiesByQuery(
        {
          in: currentTestEntityIds ?? allTestDetailIds ?? [],
          type: testType,
          nameLike: searchValue,
          workspaceKey,
        },
        {
          ...queryParams,
          ascendingBy,
          select,
          include,
        },
      );

      if (activedType === 'testPlan') {
        const { list: testRuns } = await getTestEntitiesByRelationWithOrder(
          TestRelationType.PlanRelExecution,
          { from: [selectedTestPlan.objectId] },
          {
            // FIXME: 优化查询速度
            workspaceKey,
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
                  select: ['objectId', 'runReferenceDetail', 'repository'],
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
        );

        const list = testDetails.map(detail => {
          return {
            ...detail,
            selectedTestPlanId: selectedTestPlan.objectId,
            relRuns: testRuns.filter(run => run.runReferenceDetail?.objectId === detail.objectId),
          };
        });

        setTableLoading(false);

        return {
          list,
          total: count,
        };
      }

      setTableLoading(false);

      return {
        list: testDetails,
        total: count,
      };
    },
    [
      activedType,
      currentTestEntityIds,
      allTestDetailIds,
      workspaceKey,
      selectedTestPlan,
      searchValue,
    ],
  );

  const removeTestRelation = React.useCallback(
    async (selectedTestPlanId, testDetailIds) => {
      if (!Array.isArray(testDetailIds)) return;
      await removeTestRelationsWithCondition(TestRelationType.PlanRelDetail, {
        from: selectedTestPlanId,
        to: testDetailIds,
      });
      await allTestDetailIdsRefresh();

      notification.success({
        message: `${testDetailIds.length} 个测试用例从测试计划中移除`,
      });
      actionRef.current.refresh();

      actionRef.current.resetSelectedRowKeys();
    },
    [allTestDetailIdsRefresh, actionRef],
  );

  const allTestColumns = [
    {
      width: 320,
      key: 'title',
      fixed: true,
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
            onClick={() => {
              actionConfirm('该操作会将该测试用例从测试计划中移除，是否继续操作？', () => {
                removeTestRelation(rowData.selectedTestPlanId, [rowData.objectId]);
              });
            }}
          >
            移除
          </a>
        );
      },
    },
  ];

  const handleTestRunStatusChange = async (testRunId, status) => {
    await updateTestRun(testRunId, { status: status.key });
    actionRef.current.refresh();
  };

  /** 根据列表记录删除测试执行 */
  const deleteTestRunByIds = useMemoizedFn((testRunIds, forceRestCurrentPage = false) => {
    actionConfirm('该操作会将所选测试执行删除，是否继续操作？', async () => {
      // 删除关联关系，删除测试实体
      await deleteTestEntities(testRunIds);
      notification.success({
        message: `${testRunIds.length} 个测试执行任务被删除`,
      });
      // eslint-disable-next-line no-console
      console.log(1111, forceRestCurrentPage);

      //   const refreshAndMutateDataOptions = {
      //     shouldRestSelectedRowKeys: true,
      //   } as Record<string, any>;

      // 批量删除重置回第一页
      //   if (forceRestCurrentPage) {
      //     refreshAndMutateDataOptions.shouldRestCurrentPage = true;
      //   } else {
      //     const testRunsTotal = record.relRuns?.length;
      //     const remainder = testRunsTotal % pageSize;
      //     // 单条用例删除需要判断当前页是否有数据，无数据跳上一页
      //     if (remainder === 1) {
      //       setPageNum(prevPageNum => Math.max(1, prevPageNum - 1));
      //     }
      //   }
      //   refreshAndMutateData(refreshAndMutateDataOptions);
    });
  });

  const excetionColumns = [
    {
      key: 'detailName',
      title: '用例标题',
      isSystem: true,
      fixed: true,
      width: 160,
      tooltip: true,
      render(_, record) {
        const detailItemData = record.runReferenceDetail?.reference ?? {};
        return (
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => openItemViewScreen(detailItemData.objectId)}
          >
            {detailItemData.name}
          </span>
        );
      },
    },
    {
      key: 'repositoryGroup',
      title: '所属模块',
      width: 240,
      render(_, rowData) {
        return <RepositoryGroup rowData={rowData.runReferenceDetail}></RepositoryGroup>;
      },
    },
    {
      key: 'runStatus',
      title: '测试执行状态',
      width: 150,
      render(_, record) {
        return (
          <StatusBadge
            useRootContainer
            status={record.status}
            onStatusChange={status => handleTestRunStatusChange(record.objectId, status)}
          />
        );
      },
    },
    {
      key: 'executor',
      title: '最近操作执行人',
      width: 150,
      render(_, record) {
        return <Field.User readonly userInfo={record?.executor?.[0]} />;
      },
    },
    {
      key: 'designee',
      title: '执行人',
      width: 150,
      render(_, record) {
        return <Field.User userInfo={record?.designee} />;
      },
    },
    {
      key: 'action',
      title: '操作',
      isSystem: true,
      fixed: 'right' as any,
      render(_, record) {
        return (
          <>
            <a
              onClick={async () => {
                await testRunModalActionRef.current.open({
                  testId: record.objectId,
                  testIdSequence: [],
                });
                // 刷新依赖数据
                actionRef.current.refresh();
              }}
            >
              执行
            </a>
            <a
              style={{ marginLeft: 10 }}
              onClick={async () => {
                deleteTestRunByIds([record.objectId]);
              }}
            >
              删除
            </a>
          </>
        );
      },
    },
  ];

  const allSelectableRowKeys = selectedTestPlan?.refTestDetails?.map(detail => detail.objectId);

  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      if (hasRowSelected) {
        actionConfirm('该操作会将所选测试用例从测试计划中移除，是否继续操作？', () => {
          removeTestRelation(selectedTestPlan?.objectId, actionRef.current.selectedRowKeys);
        });
      }
    };

    // 更新负责人
    const handleAssigneeChange = async assignees => {
      setTableLoading(true);
      const testIds = actionRef.current.selectedRowKeys;
      await updateItemAssignee(testIds, assignees);

      setTimeout(() => {
        actionRef.current.refresh();
        mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
      }, 1000);

      setTableLoading(false);
      notification.success({
        message: `${testIds.length} 个测试负责人已更新`,
      });
    };

    return [
      <UserCell
        value={[]}
        key="assignee"
        mode="multiple"
        userData={userData}
        readonly={!hasRowSelected}
        onChange={handleAssigneeChange}
        emptyChild={
          <span className="user-field">
            <UserOutlined /> 设置负责人
          </span>
        }
      />,

      <span key="delete" onClick={() => hasRowSelected && handleDelete()}>
        <DeleteOutlined /> 移除
      </span>,
    ];
  }, [userData, hasRowSelected, removeTestRelation, selectedTestPlan, mutateTestPlanEvent]);

  tableSelectionToggleEvent.useSubscription(visible => {
    actionRef.current.toggleSelection(visible);
    actionRef.current.resetSelectedRowKeys();
  });

  return (
    <div className={cx('test-entity-list-box')} style={{ height: 'calc(100% - 36px)' }}>
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: activedType === 'testPlan' ? 'TestDetail' : 'TestRun',
        }}
        useColumnSetting
        defaultColumnKey={['createdBy', 'createdAt']}
        rowKey="objectId"
        columns={activedType === 'testPlan' ? allTestColumns : excetionColumns}
        name="TestEntityList"
        actionRef={actionRef}
        loading={tableLoading}
        getDataSource={tableDataGetter}
        onHasRowSelected={setHasRowSelected}
        allSelectableRowKeys={allSelectableRowKeys}
        selectionActionNodes={selectionActionNodes}
        onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
      />
      <TestRunModal actionRef={testRunModalActionRef} />
    </div>
  );
};

export default TestEntityList;
