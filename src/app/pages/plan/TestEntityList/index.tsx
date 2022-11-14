import React, { useCallback, useEffect, useState } from 'react';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import Field from '@/components/common/Field';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import RepositoryGroup from '@/components/business/RepositoryGroup';
import { StatusBadge } from '@/components/business/Status';
import { notification, Button, Tooltip } from 'antd';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { useMemoizedFn, useRequest } from 'ahooks';
import { DeleteOutlined, FlagOutlined, UserOutlined } from '@ant-design/icons';
import { UserCell } from '@projectproxima/components';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import { usePageContext } from '../hook';
import { useListener } from '@projectproxima/proxima-sdk-js';
import {
  deleteTestEntity,
  getLinkedTestEntityByQuery,
  getTestCaseStats,
  getTestEntityByQuery,
  updateTestEntity,
  updateTestStatus,
} from '@/lib/api/item';
import { TestLinkType, TestType } from 'common/constant';
import { RepositoryModel } from '@/lib/constants';
import { isEmpty, isEqual } from 'lodash';
import { useTestRunActionAuth, useCanExecuteTestRunIdSequence } from '@/lib/hooks/useTest';

import cx from './index.less';

interface TestEntityListProps {
  loading?: boolean;
  requestScopedTestDetailIds?: string[];
  activedType: string;
  selectedExecution?: Record<string, any>;
  refreshPlanData?: () => void;
  scopedTestDetailRefresh?: () => void;
  tableSelectionVisible?: boolean;
  testDetailFieldKeys?: string[];
}

const TestEntityList: React.FC<TestEntityListProps> = ({
  loading,
  activedType,
  requestScopedTestDetailIds,
  selectedExecution,
  scopedTestDetailRefresh,
  tableSelectionVisible,
  testDetailFieldKeys,
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
  const { canExecuteTestRun, canAssignTestRun } = useTestRunActionAuth({ workspaceKey });

  const [tableLoading, setTableLoading] = useState(false);
  const [hasRowSelected, setHasRowSelected] = useState(false);
  const { getCanExecuteTestRunIdSequence } = useCanExecuteTestRunIdSequence({ workspaceKey });

  React.useEffect(() => {
    registerRefreshMethod({
      detailTable: actionRef.current?.refresh,
    });
  }, [registerRefreshMethod]);

  // 事项数据更新后刷新列表
  useListener('updateItemList', () => {
    setTimeout(() => {
      actionRef.current.refresh();
    }, 400);
  });

  useListener('updateTestRunStatus', () => {
    actionRef.current.refresh();
  });

  useListener('closeItemViewScreen', () => {
    setTimeout(() => {
      scopedTestDetailRefresh();
    }, 400);
  });

  const { data: allRunData } = useRequest(
    async () => {
      if (activedType === 'TestPlan') return [];
      if (!requestScopedTestDetailIds?.length || !selectedExecution?.objectId) {
        return [];
      }
      const { list: runData } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          referenceCase: requestScopedTestDetailIds,
        },
        limit: 9999,
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: [selectedExecution.objectId],
        destinationType: TestType.Run,
        select: ['id', 'referenceCase'],
      });

      return runData;
    },
    {
      refreshDeps: [workspaceKey, requestScopedTestDetailIds, selectedExecution],
    },
  );

  // 获取全部用例 getter
  const testPlanTableDataGetter = useCallback(
    async queryParams => {
      if (!requestScopedTestDetailIds?.length) {
        return {
          list: [],
          total: 0,
        };
      }
      setTableLoading(true);

      // 查询测试用例
      const { list: testDeatils, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          id: requestScopedTestDetailIds,
        },
        ...queryParams,
        fields: testDetailFieldKeys ?? [],
        selector: selectors,
      });

      // 查询统计数据
      const stats = await getTestCaseStats({
        planId: selectedTestPlan.objectId,
        select: ['runCount', 'caseLatestStatus'],
        caseIds: testDeatils.map(d => d.objectId),
      });

      const list = testDeatils.map(detail => ({
        ...detail,
        selectedTestPlanId: selectedTestPlan.objectId,
        ...(stats?.[detail.objectId] ?? {}),
      }));

      setTableLoading(false);

      return {
        list: list,
        total: total,
      };
    },
    [
      workspaceKey,
      requestScopedTestDetailIds,
      selectedTestPlan.objectId,
      selectors,
      testDetailFieldKeys,
    ],
  );

  // 获取执行任务 getter
  const executionTableDataGetter = useCallback(
    async queryParams => {
      if (!selectedExecution?.objectId || !requestScopedTestDetailIds?.length)
        return {
          list: [],
          total: 0,
        };
      // 查询测试执行
      const { list: runs, total } = await getLinkedTestEntityByQuery(
        {
          query: {
            workspaceKey: workspaceKey,
            referenceCase: requestScopedTestDetailIds,
          },
          ...queryParams,
          linkType: TestLinkType.RunLinkExecution,
          sourceIds: [selectedExecution.objectId],
          destinationType: TestType.Run,
          selector: [{}, selectors?.[1] ?? {}],
        },
        props => {
          const [systemSelectors, customSelector] = props?.selector;

          const extraQuery = Object.entries(customSelector ?? {}).reduce(
            (prev, [key, value]: any) => {
              if (key !== RepositoryModel) {
                const filed = key.replace('test_', '');
                prev[filed] = value.value.map(d => {
                  if ('currentUser' === d.username) {
                    return 'currentUser()';
                  }
                  if ('osc-admin' === d.username) {
                    return 'osc-admin';
                  }
                  return d.username;
                });
              }
              return prev;
            },
            {},
          );
          return {
            ...props,
            selector: [systemSelectors ?? {}, {}],
            query: {
              ...props.query,
              ...extraQuery,
            },
          };
        },
      );

      const { list: testItem } = runs?.length
        ? await getTestEntityByQuery({
            query: {
              workspaceKey: workspaceKey,
              type: TestType.Case,
              id: runs.map(d => d.referenceCase),
            },
            fields: testDetailFieldKeys ?? [],
            limit: 9999,
          })
        : {
            list: [],
          };

      setTableLoading(false);

      return {
        list: runs.map(d => {
          const item = testItem.find(item => item.objectId === d.referenceCase);
          return {
            ...d,
            repository: item?.repository,
            item,
          };
        }),
        total,
      };
    },
    [workspaceKey, requestScopedTestDetailIds, selectedExecution, selectors, testDetailFieldKeys],
  );

  useEffect(() => {
    const [systemSelectors] = selectors;
    if (!isEmpty(systemSelectors) && activedType !== 'TestPlan') {
      setTableLoading(true);
      scopedTestDetailRefresh();
      const isEmptyValue = Object.values(systemSelectors)
        .map(d => d?.value)
        .filter(Boolean);
      // 筛选器有 tag 值为空时取消 loading
      if (isEmptyValue.length) {
        setTableLoading(false);
      }
    }
  }, [selectors, scopedTestDetailRefresh, activedType]);

  const removeTestRelation = React.useCallback(
    async (planId, testDetails) => {
      if (!Array.isArray(testDetails)) return;
      await updateTestEntity(
        testDetails.map(d => ({
          objectId: d.id,
          linkItems: {
            action: 'delete',
            value: [planId],
          },
          caseStatus: Object.entries(d.caseStatus ?? {}).reduce((prev, [key, value]) => {
            if (planId !== key) {
              prev[key] = value;
            }
            return prev;
          }, {}),
        })),
      );

      actionRef.current.resetSelectedRowKeys();

      await scopedTestDetailRefresh();

      notification.success({
        message: `${testDetails.length} 个测试用例从测试计划中移除`,
      });
      // refreshPlanData();
    },
    [scopedTestDetailRefresh],
  );

  const allTestColumns = [
    {
      width: 320,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: '标题',
      render(_, rowData) {
        const itemData = rowData ?? {};
        return (
          <span
            data-drawer-handle-target
            style={{ cursor: 'pointer' }}
            onClick={() => openItemViewScreen(itemData.objectId)}
          >
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
      key: 'caseLatestStatus',
      title: '最新执行状态',
      width: 200,
      render(_, rowData) {
        return (
          <StatusBadge readonly status={rowData.caseLatestStatus} className={cx('cell-min')} />
        );
      },
    },
    {
      key: 'runCount',
      title: <span>执行任务次数</span>,
      width: 140,
      render(_, rowData) {
        return rowData.runCount ?? 0;
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
                removeTestRelation(rowData.selectedTestPlanId, [rowData]);
              });
            }}
          >
            移除
          </a>
        );
      },
    },
  ];

  const handleTestRunStatusChange = useCallback(
    async (testRun, status) => {
      // 更新测试执行状态
      // 更新测试执行对应的测试用例状态
      await updateTestStatus({
        runIds: [testRun.objectId],
        status: status.key,
        planId: selectedTestPlan.objectId,
      });
      actionRef.current.refresh();
      mutateStatusEvent.emit('refreshExecutionStatus');
    },
    [mutateStatusEvent, selectedTestPlan.objectId],
  );

  /** 根据列表记录删除测试执行 */
  const deleteTestRunByIds = useMemoizedFn(testRunIds => {
    actionConfirm('该操作会将所选测试执行删除，是否继续操作？', async () => {
      // 删除测试执行
      await deleteTestEntity(testRunIds);

      setTimeout(() => {
        scopedTestDetailRefresh();
        actionRef.current.resetSelectedRowKeys();
        mutateStatusEvent.emit('refreshExecutionStatus');
        notification.success({
          message: `${testRunIds.length} 个用例执行被删除`,
        });
      }, 500);
    });
  });

  const testIdSequence = allRunData
    ?.filter(run => requestScopedTestDetailIds?.includes(run.referenceCase))
    ?.map(run => run.id)
    .filter(Boolean);

  const executionColumns = [
    {
      key: 'detailName',
      title: '用例标题',
      isSystem: true,
      fixed: true,
      width: 160,
      tooltip: true,
      render(_, record) {
        return (
          <span
            data-drawer-handle-target
            style={{ cursor: 'pointer' }}
            onClick={() => openItemViewScreen(record?.referenceCase)}
          >
            {record?.name}
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
      key: 'runStatus',
      title: '测试执行状态',
      shouldCellUpdate: (record, prevRecord) =>
        !isEqual(record.designee, prevRecord.designee) ||
        !isEqual(record.status, prevRecord.status),
      width: 150,
      render(_, record) {
        const { result: enabled } = canExecuteTestRun(record.designee);
        return (
          <StatusBadge
            useRootContainer
            readonly={!enabled}
            status={record.status}
            onStatusChange={status => handleTestRunStatusChange(record, status)}
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
      shouldCellUpdate: (record, prevRecord) =>
        record.repository?.objectId !== prevRecord.repository?.objectId ||
        !isEqual(record.designee, prevRecord.designee),
      render(_, record) {
        const { result: enabled, message } = canExecuteTestRun(record.designee);
        return (
          <div className={cx('run-link')}>
            <Tooltip title={message} placement="topLeft">
              <Button
                type="link"
                disabled={!enabled}
                onClick={async () => {
                  await testRunModalActionRef.current.open({
                    testId: record.objectId,
                  });
                  // 刷新依赖数据
                  actionRef.current.refresh();
                  mutateStatusEvent.emit('refreshExecutionStatus');
                }}
              >
                执行
              </Button>
            </Tooltip>
            <Button
              type="link"
              style={{ marginLeft: 10 }}
              onClick={async () => {
                deleteTestRunByIds([record.objectId]);
              }}
            >
              删除
            </Button>
          </div>
        );
      },
    },
  ];

  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      if (hasRowSelected) {
        actionConfirm('该操作会将所选测试用例从测试计划中移除，是否继续操作？', async () => {
          setTableLoading(true);
          const { list: items } = await getTestEntityByQuery({
            query: {
              workspaceKey: workspaceKey,
              type: TestType.Case,
              id: actionRef.current.selectedRowKeys ?? [],
            },
            limit: 99999,
            select: ['id', 'caseStatus'],
          });
          await updateTestEntity(
            items.map(item => ({
              objectId: item.id,
              linkItems: {
                action: 'delete',
                value: [selectedTestPlan?.objectId],
              },
              caseStatus: Object.entries(item.caseStatus ?? {}).reduce((prev, [key, value]) => {
                if (selectedTestPlan?.objectId !== key) {
                  prev[key] = value;
                }
                return prev;
              }, {}),
            })),
          );

          setTimeout(() => {
            scopedTestDetailRefresh();
            actionRef.current.resetSelectedRowKeys();
            tableSelectionToggleEvent.emit(false);
            setTableLoading(false);
          }, 500);
        });
      }
    };

    // 更新负责人
    const handleAssigneeChange = async assignee => {
      setTableLoading(true);
      const testIds = actionRef.current.selectedRowKeys;

      await updateTestEntity(
        testIds.map(d => ({
          objectId: d,
          values: {
            assignee,
          },
        })),
      );

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
  }, [
    userData,
    hasRowSelected,
    workspaceKey,
    tableSelectionToggleEvent,
    scopedTestDetailRefresh,
    selectedTestPlan?.objectId,
    mutateTestPlanEvent,
  ]);

  const InnerTableSelectionActionNodes = React.useMemo(() => {
    const getTestRunIds = () => actionRef.current.selectedRowKeys;

    const toggleSTestRunStatus = async status => {
      const testRunIds = getTestRunIds();

      // 可执行的测试执行 id
      const canExecuteTestRunIds = await getCanExecuteTestRunIdSequence(testRunIds);

      setTableLoading(true);

      // 更新测试执行状态
      await updateTestStatus({
        status: status.key,
        runIds: canExecuteTestRunIds,
        planId: selectedTestPlan?.objectId,
      });

      notification.success({
        message: '所选测试执行状态更新成功',
      });
      setTableLoading(false);
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
      setTableLoading(true);
      // 更新测试执行执行人
      await updateTestEntity(
        testRunIds.map(run => ({
          objectId: run,
          designee: users,
        })),
      );

      notification.success({
        message: '所选测试执行人更新成功',
      });
      setTableLoading(false);
      actionRef.current.refresh();
      mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
      mutateStatusEvent.emit('refreshExecutionStatus');
      // refreshAndMutateData();
    };

    const canDesigneeSelect = canAssignTestRun();

    return [
      <Tooltip key="assignee" title={canDesigneeSelect ? null : '不可对用例更改执行人'}>
        <span className={cx(!canDesigneeSelect && 'disabled')}>
          <UserCell
            value={[]}
            mode="multiple"
            userData={userData}
            readonly={!canDesigneeSelect || !hasRowSelected}
            onChange={handleDesigneeChange}
            emptyChild={
              <span className="user-field">
                <UserOutlined /> 更改执行人
              </span>
            }
          />
        </span>
      </Tooltip>,
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
  }, [
    canAssignTestRun,
    userData,
    hasRowSelected,
    getCanExecuteTestRunIdSequence,
    selectedTestPlan?.objectId,
    mutateTestPlanEvent,
    mutateStatusEvent,
    deleteTestRunByIds,
  ]);

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
            testType: TestType.Case,
          }}
          useColumnSetting
          defaultColumnKey={[
            'key',
            'repositoryGroup',
            'caseLatestStatus',
            'runCount',
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
            testType: TestType.Case,
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
          columns={executionColumns}
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
      {activedType !== 'TestPlan' && (
        <TestRunModal
          actionRef={testRunModalActionRef}
          idSequence={allRunData?.map(run => run.id)}
          selectedTestPlanId={selectedTestPlan.objectId}
        />
      )}
    </div>
  );
};

export default TestEntityList;
