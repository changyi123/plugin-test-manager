/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useState } from 'react';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import {
  deleteTestEntities,
  getTestEntitiesByQuery,
  getTestEntitiesByRelation,
  removeTestRelationsWithCondition,
  updateTestRunDesignee,
  fetchItemFromIql,
  getTestEntitiesByRelationWithOrder,
} from '@/lib/api/common';
import { TestRelationType, TestType } from '@/lib/constants';
import Field from '@/components/common/Field';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import RepositoryGroup from '@/components/business/RepositoryGroup';
import { StatusBadge } from '@/components/business/Status';
import { notification } from 'antd';
import { getTestRunsByTestDetails, updateTestRun, updateTestRunStatus } from '@/lib/api/runs';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { useMemoizedFn } from 'ahooks';
import { DeleteOutlined, FlagOutlined, UserOutlined } from '@ant-design/icons';
import { updateItemAssignee } from '@/lib/api/proxima';
import { UserCell } from '@projectproxima/components';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import { usePageContext } from '../hook';
import { Test } from '@/lib/models';
import cx from './index.less';
import { isEmpty, omit, pick } from 'lodash';
import { selectorToParse, simpleToParse } from '@/lib/utils/iql';

interface TestEntityListProps {
  loading?: boolean;
  requestScopedTestDetailIds?: string[];
  activedType: string;
  selectedExecution?: Record<string, any>;
  curTestRuns?: Record<string, any>[];
  refreshPlanData?: () => void;
  scopedTestDetailRefresh?: () => void;
  tableSelectionVisible?: boolean;
}

const TestEntityList: React.FC<TestEntityListProps> = ({
  loading,
  activedType,
  requestScopedTestDetailIds,
  selectedExecution,
  curTestRuns,
  refreshPlanData,
  scopedTestDetailRefresh,
  tableSelectionVisible,
}) => {
  const {
    workspaceKey,
    selectors,
    selectedTestPlan,
    registerRefreshMethod,
    mutateTestPlanEvent,
    mutateStatusEvent,
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

  const testPlanTableDataGetter = useCallback(
    async queryParams => {
      if (!requestScopedTestDetailIds?.length) {
        return {
          list: [],
          total: 0,
        };
      }

      setTableLoading(true);

      const include = ['repository', 'reference'];

      const select = ['type', 'sortIndex', 'reference', 'repository', 'workspaceKey', 'createdAt'];

      const { results: testDetails, count } = await getTestEntitiesByQuery(
        {
          in: requestScopedTestDetailIds ?? [],
          type: TestType.TestDetail,
          selectors,
          workspaceKey,
        },
        {
          ...queryParams,
          select,
          include,
        },
      );

      const { list: executionList } = await getTestEntitiesByRelationWithOrder(
        TestRelationType.PlanRelExecution,
        { from: [selectedTestPlan.objectId] },
        {
          // FIXME: 优化查询速度
          workspaceKey,
          fillItemData: true,
          queryParams: { limit: 9999 },
          include: ['objectId'],
          select: ['objectId'],
        },
      );

      // FIXME优化全部用例查询测试执行次数方法
      const testRuns = await getTestRunsByTestDetails({
        testDetailIds: testDetails?.map(d => d.objectId) ?? [],
        executionIds: executionList.map(d => d.objectId),
        workspaceKey,
      });

      const list = testDetails.map(detail => {
        return {
          ...detail,
          selectedTestPlanId: selectedTestPlan.objectId,
          relRuns: testRuns?.filter(run => run.runReferenceDetail?.objectId === detail.objectId),
        };
      });

      setTableLoading(false);

      return {
        list,
        total: count,
      };
    },
    [workspaceKey, requestScopedTestDetailIds, selectedExecution, selectors],
  );

  // 获取当前计划或者当前测试任务的全部测试用例 ID
  const executionTableDataGetter = useCallback(
    async queryParams => {
      if (!selectedExecution?.objectId || !requestScopedTestDetailIds?.length) {
        return {
          list: [],
          total: 0,
        };
      }

      setTableLoading(true);
      const include = [
        'status',
        'sortIndex',
        'runReferenceDetail.reference',
        'runReferenceDetail.repository',
        'executor',
        'designee',
      ];

      const select = [
        'status',
        'sortIndex',
        'runReferenceDetail.reference',
        'runReferenceDetail.repository',
        'executor',
        'designee',
      ];

      const { list, total } = await getTestEntitiesByRelation(
        TestRelationType.ExecutionRelRun,
        {
          from: selectedExecution?.objectId,
        },
        {
          queryParams,
          include,
          select,
          testDetailIds: requestScopedTestDetailIds?.filter(Boolean),
          parseMiddleware: async query => {
            const testQuery = new Parse.Query(Test);
            const [itemSelector, testManageSelector] = selectors ?? [];
            let needUpdate = false;
            if (!isEmpty(itemSelector)) {
              // 只有一个选择器，且 name value 为空时，不需要执行 iql 筛选逻辑
              const onlyOneEmptyNameSelector =
                Object.keys(itemSelector).length === 1 &&
                itemSelector.name &&
                !itemSelector.name.value;

              if (!onlyOneEmptyNameSelector) {
                const ids = await fetchItemFromIql(itemSelector, workspaceKey);
                needUpdate = true;
                if (ids?.length) {
                  testQuery.containedIn('reference', ids);
                } else {
                  testQuery.doesNotExist('reference');
                }
              }
            }

            if (!isEmpty(testManageSelector)) {
              needUpdate = true;
              // 处理非执行人的字段
              selectorToParse(
                testQuery,
                omit(testManageSelector, ['test_executor', 'test_designee']),
              );
            }

            let jointQuery = new Parse.Query(Test).matchesQuery('runReferenceDetail', testQuery);

            // 处理执行人
            const userSelector = pick(testManageSelector, ['test_executor', 'test_designee']);
            if (!isEmpty(userSelector)) {
              const userQuery = new Parse.Query(Test);
              Object.keys(userSelector).forEach(key => {
                simpleToParse(userQuery, userSelector[key]);
              });
              jointQuery = Parse.Query.and(jointQuery, userQuery);
            }

            if (needUpdate) {
              query.matchesQuery('to', jointQuery);
            }
          },
        },
      );

      setTableLoading(false);

      return {
        list: list.map(d => ({
          ...d,
          reference: d.runReferenceDetail.reference,
        })),
        total,
      };
    },
    [workspaceKey, requestScopedTestDetailIds, selectedExecution, selectors],
  );

  const removeTestRelation = React.useCallback(
    async (selectedTestPlanId, testDetailIds) => {
      if (!Array.isArray(testDetailIds)) return;
      await removeTestRelationsWithCondition(TestRelationType.PlanRelDetail, {
        from: selectedTestPlanId,
        to: testDetailIds,
      });
      await scopedTestDetailRefresh();

      notification.success({
        message: `${testDetailIds.length} 个测试用例从测试计划中移除`,
      });
      actionRef.current.refresh();

      actionRef.current.resetSelectedRowKeys();
      refreshPlanData();
    },
    [actionRef],
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
        return rowData.relRuns?.length ?? 0;
      },
    },
    {
      key: 'action',
      isSystem: true,
      title: '操作',
      width: 90,
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
    mutateStatusEvent.emit('refreshExecutionStatus');
    // TODO
  };

  /** 根据列表记录删除测试执行 */
  const deleteTestRunByIds = useMemoizedFn(testRunIds => {
    actionConfirm('该操作会将所选测试执行删除，是否继续操作？', async () => {
      // 删除关联关系，删除测试实体
      await deleteTestEntities(testRunIds);
      await scopedTestDetailRefresh();
      actionRef.current.refresh();
      actionRef.current.resetSelectedRowKeys();
      mutateStatusEvent.emit('refreshExecutionStatus');
      tableSelectionToggleEvent.emit(false);
      notification.success({
        message: `${testRunIds.length} 个测试执行任务被删除`,
      });
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
        const detailItemData = record?.runReferenceDetail?.reference ?? {};

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
                  testIdSequence: curTestRuns?.map(item => item?.objectId),
                });
                // 刷新依赖数据
                actionRef.current.refresh();
                mutateStatusEvent.emit('refreshExecutionStatus');
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

  const testIdSequence = curTestRuns
    ?.filter(d => requestScopedTestDetailIds?.includes(d.runReferenceDetail.objectId))
    ?.map(item => item?.objectId)
    .filter(Boolean);

  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      if (hasRowSelected) {
        actionConfirm('该操作会将所选测试用例从测试计划中移除，是否继续操作？', () => {
          removeTestRelation(selectedTestPlan?.objectId, actionRef.current.selectedRowKeys);
          actionRef.current.resetSelectedRowKeys();
          tableSelectionToggleEvent.emit(false);
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

  const InnerTableSelectionActionNodes = React.useMemo(() => {
    const getTestRunIds = () => actionRef.current.selectedRowKeys;

    const toggleSTestRunStatus = async status => {
      const testRunIds = getTestRunIds();

      await updateTestRunStatus({
        status: status.key,
        testRunIds,
      });
      notification.success({
        message: '所选测试执行状态更新成功',
      });
      actionRef.current.refresh();
      mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
      mutateStatusEvent.emit('refreshExecutionStatus');
      // refreshAndMutateData();
    };

    const deleteTestRun = () => {
      const testRunIds = getTestRunIds();

      deleteTestRunByIds(testRunIds);
    };

    // 更新测试执行人
    const handleDesigneeChange = async users => {
      const testRunIds = getTestRunIds();

      users = users.map(user => ({
        ...user,
        objectId: user.value,
      }));

      await updateTestRunDesignee(testRunIds, users);
      actionRef.current.refresh();
      mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
      // refreshAndMutateData();
    };

    return [
      <UserCell
        value={[]}
        key="assignee"
        mode="multiple"
        userData={userData}
        readonly={!hasRowSelected}
        onChange={handleDesigneeChange}
        emptyChild={
          <span className="user-field">
            <UserOutlined /> 更改执行人
          </span>
        }
      />,
      <StatusBadge
        useRootContainer
        readonly={!hasRowSelected}
        onStatusChange={toggleSTestRunStatus}
        key="toggleRunStatus"
        emptyNode={
          <span>
            <FlagOutlined /> 更改执行状态
          </span>
        }
      />,

      <span key="delete" onClick={() => hasRowSelected && deleteTestRun()}>
        <DeleteOutlined /> 删除
      </span>,
    ];
  }, [userData, hasRowSelected, deleteTestRunByIds]);

  tableSelectionToggleEvent.useSubscription(visible => {
    actionRef.current.toggleSelection(visible);
    actionRef.current.resetSelectedRowKeys();
  });

  return (
    <div className={cx('test-entity-list-box')}>
      {activedType === 'TestPlan' ? (
        <BusinessTable
          className={cx(`${tableSelectionVisible ? 'batch-action' : ''}`)}
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
          columns={allTestColumns}
          name={'AllTestEntity'}
          actionRef={actionRef}
          loading={tableLoading || loading}
          getDataSource={testPlanTableDataGetter}
          onHasRowSelected={setHasRowSelected}
          allSelectableRowKeys={requestScopedTestDetailIds}
          selectionActionNodes={selectionActionNodes}
          onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
        />
      ) : (
        <BusinessTable
          className={cx(`${tableSelectionVisible ? 'batch-action' : ''}`)}
          titleCellOption={{
            workspaceKey,
            testType: 'TestDetail',
          }}
          useColumnSetting
          defaultColumnKey={[
            'key',
            'repositoryGroup',
            'designee',
            'runStatus',
            'createdBy',
            'createdAt',
            'executor',
          ]}
          rowKey="objectId"
          columns={excetionColumns}
          name={'TestExecutionList'}
          actionRef={actionRef}
          loading={tableLoading || loading}
          getDataSource={executionTableDataGetter}
          onHasRowSelected={setHasRowSelected}
          allSelectableRowKeys={testIdSequence}
          selectionActionNodes={InnerTableSelectionActionNodes}
          onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
        />
      )}
      <TestRunModal actionRef={testRunModalActionRef} />
    </div>
  );
};

export default TestEntityList;
