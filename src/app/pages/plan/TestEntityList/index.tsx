import React, { useCallback, useEffect, useState } from 'react';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import Field from '@/components/common/Field';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import RepositoryGroup from '@/components/business/RepositoryGroup';
import { StatusBadge } from '@/components/business/Status';
import { notification, Button, Tooltip, message } from 'antd';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { useMemoizedFn, useRequest } from 'ahooks';
import { DeleteOutlined, FlagOutlined, UserOutlined } from '@ant-design/icons';
import { UserCell } from '@giteeteam/apps-team-components';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import { usePageContext } from '../hook';
import { useListener } from '@projectproxima/proxima-sdk-js';
import {
  deleteTestEntity,
  getCasesByStatus,
  getLinkedTestEntityByQuery,
  getTestCaseStats,
  getTestEntityByQuery,
  updateTestEntity,
  updateTestStatus,
} from '@/lib/api/item';
import { BuiltinFieldNameMapping, TestLinkType, TestType } from 'common/constant';
import { RepositoryModel, TestCaseStatusModel } from '@/lib/constants';
import { intersection, isEmpty, isEqual } from 'lodash';
import { useTestRunActionAuth, useCanExecuteTestRunIdSequence } from '@/lib/hooks/useTest';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { useCurrentUser } from '@/lib/api/user';
import { useBaseAction } from '@/lib/hooks/useContext';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import useI18n from '@/lib/hooks/useI18n';
import { getTestCaseStatusModelValue, handleCustomerSelector } from '@/lib/utils/iql';

import cx from './index.less';

interface TestEntityListProps {
  loading?: boolean;
  requestScopedTestDetailIds?: string[];
  activeType: string;
  selectedExecution?: Record<string, any>;
  refreshPlanData?: () => void;
  scopedTestDetailRefresh?: () => void;
  tableSelectionVisible?: boolean;
  testDetailFieldKeys?: string[];
}

const TestEntityList: React.FC<TestEntityListProps> = ({
  loading,
  activeType,
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
  const { t } = useI18n();
  const proxima = createProximaSdk();
  const { getCreatePermission } = useBaseAction();
  const actionRef = React.useRef<BusinessTableActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();
  const userData = useUserCellUserDataProp(workspaceKey);
  const { canExecuteTestRun, canAssignTestRun } = useTestRunActionAuth({ workspaceKey });
  const { data: currentUser } = useCurrentUser();

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
      if (activeType === 'TestPlan') return [];
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

  const { data: currentFields } = useRequest(
    async () => {
      return await getCurrentUserSetting({ workspaceKey, user: currentUser });
    },
    {
      refreshDeps: [workspaceKey, currentUser],
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

      // 处理测试用例最新状态筛选
      let caseIds = requestScopedTestDetailIds;
      const { selector, runStatusSelector } = handleCustomerSelector(selectors);
      if (runStatusSelector[TestCaseStatusModel]?.value?.length) {
        const params = getTestCaseStatusModelValue(runStatusSelector);
        const { data: ids } = await getCasesByStatus({
          planId: selectedTestPlan.objectId,
          ...params,
        });
        caseIds = intersection(requestScopedTestDetailIds, ids);
      }

      // 查询测试用例
      const { list: testDetails, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          id: caseIds,
        },
        ...queryParams,
        fields: testDetailFieldKeys ?? [],
        selector,
      });

      // 查询统计数据
      const stats = await getTestCaseStats({
        planId: selectedTestPlan.objectId,
        select: ['runCount', 'caseLatestStatus'],
        caseIds: testDetails.map(d => d.objectId),
      });

      const list = testDetails.map(detail => ({
        ...detail,
        selectedTestPlanId: selectedTestPlan.objectId,
        ...(stats?.[detail.objectId] ?? {}),
        status: detail.workflowStatus,
        caseLatestExecutor: detail.caseExecutor?.[selectedTestPlan.objectId],
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
          const [, customSelector] = props?.selector;

          const runSelector = Object.entries(customSelector ?? {}).reduce(
            (prev, [key, value]: any) => {
              if (key !== RepositoryModel && key.includes('test_manager_')) {
                const fieldName =
                  BuiltinFieldNameMapping?.[key.replace('test_manager_', '')] ?? value.fieldName;
                prev[key] = {
                  ...value,
                  fieldName,
                };
              }
              return prev;
            },
            {},
          );

          return {
            ...props,
            selector: [{}, runSelector],
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
            name: item.name,
            key: item.key,
            values: item.values,
            status: item.workflowStatus,
            runStatus: d.status,
          };
        }),
        total,
      };
    },
    [workspaceKey, requestScopedTestDetailIds, selectedExecution, selectors, testDetailFieldKeys],
  );

  useEffect(() => {
    const [systemSelectors] = selectors;
    if (!isEmpty(systemSelectors) && activeType !== 'TestPlan') {
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
  }, [selectors, scopedTestDetailRefresh, activeType]);

  const removeTestRelation = React.useCallback(
    async (planId, testDetails) => {
      if (!Array.isArray(testDetails)) return;
      const res = await updateTestEntity(
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
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }

      actionRef.current.resetSelectedRowKeys();

      await scopedTestDetailRefresh();

      notification.success({
        message: `${testDetails.length} ${t('page.plan.testEntityList.removeCaseMessage')}`,
      });
      // refreshPlanData();
    },
    [scopedTestDetailRefresh, t],
  );

  const allTestColumns = [
    {
      width: 400,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: t('common.title'),
      className: 'test-case-title',
      extraProps: {
        onClick: record => {
          openItemViewScreen(record?.objectId);
        },
      },
      render(_, rowData) {
        const itemData = rowData ?? {};
        return (
          <span data-drawer-handle-target style={{ cursor: 'pointer' }}>
            {itemData.name}
          </span>
        );
      },
    },
    {
      key: 'repositoryGroup',
      title: t('page.plan.testEntityList.repositoryGroup'),
      width: 200,
      render(_, rowData) {
        return <RepositoryGroup rowData={rowData}></RepositoryGroup>;
      },
    },
    {
      key: 'caseLatestStatus',
      title: t('page.plan.testEntityList.caseLatestStatus'),
      width: 200,
      render(_, rowData) {
        return (
          <StatusBadge readonly status={rowData.caseLatestStatus} className={cx('cell-min')} />
        );
      },
    },
    {
      key: 'caseLatestExecutor',
      title: t('page.plan.testEntityList.caseLatestExecutor'),
      width: 200,
      render(_, rowData) {
        return <Field.User userInfo={rowData?.caseLatestExecutor} />;
      },
    },
    {
      key: 'runCount',
      title: <span>{t('page.plan.testEntityList.runCount')}</span>,
      width: 140,
      render(_, rowData) {
        return rowData.runCount ?? 0;
      },
    },
    {
      key: 'action',
      isSystem: true,
      title: t('common.action'),
      width: 90,
      fixed: 'right' as any,
      render(_, rowData) {
        return (
          <a
            onClick={() => {
              actionConfirm(
                {
                  title: t('common.tip'),
                  okText: t('common.okText'),
                  cancelText: t('common.cancel'),
                  content: t('page.plan.testEntityList.removeCaseTips'),
                },
                () => {
                  removeTestRelation(rowData.selectedTestPlanId, [rowData]);
                },
              );
            }}
          >
            {t('common.remove')}
          </a>
        );
      },
    },
  ];

  const handleTestRunStatusChange = useCallback(
    async (testRun, status) => {
      // 更新测试执行状态
      // 更新测试执行对应的测试用例状态
      const res = await updateTestStatus({
        runIds: [testRun.objectId],
        status: status.key,
        planId: selectedTestPlan.objectId,
      });
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }
      actionRef.current.refresh();
      mutateStatusEvent.emit('refreshExecutionStatus');
    },
    [mutateStatusEvent, selectedTestPlan.objectId],
  );

  /** 根据列表记录删除测试执行 */
  const deleteTestRunByIds = useMemoizedFn(testRunIds => {
    actionConfirm(
      {
        title: t('common.tip'),
        okText: t('common.okText'),
        cancelText: t('common.cancel'),
        content: t('page.plan.testEntityList.deleteRunTips'),
      },
      async () => {
        // 删除测试执行
        const res = await deleteTestEntity(testRunIds);
        if (res?.status === 'error') {
          message.error(res.data);
          return;
        }

        scopedTestDetailRefresh();
        actionRef.current.resetSelectedRowKeys();
        mutateStatusEvent.emit('refreshExecutionStatus');
        notification.success({
          message: `${testRunIds.length} ${t('page.plan.testEntityList.deleteRunMessage')}`,
        });
        proxima.execute('refreshTestRunPanel');
      },
    );
  });

  const testIdSequence = allRunData
    ?.filter(run => requestScopedTestDetailIds?.includes(run.referenceCase))
    ?.map(run => run.id)
    .filter(Boolean);

  const executionColumns = [
    {
      key: 'detailName',
      title: t('page.plan.testEntityList.detailName'),
      isSystem: true,
      fixed: true,
      className: 'test-case-title',
      width: 400,
      tooltip: true,
      extraProps: {
        onClick: record => {
          openItemViewScreen(record?.referenceCase);
        },
      },
      render(_, record) {
        return (
          <span data-drawer-handle-target style={{ cursor: 'pointer' }}>
            {record?.name}
          </span>
        );
      },
    },
    {
      key: 'repositoryGroup',
      title: t('page.plan.testEntityList.repositoryGroup'),
      width: 200,
      render(_, rowData) {
        return <RepositoryGroup rowData={rowData}></RepositoryGroup>;
      },
    },
    {
      key: 'runStatus',
      title: t('page.plan.testEntityList.runStatus'),
      shouldCellUpdate: (record, prevRecord) =>
        !isEqual(record.designee, prevRecord.designee) ||
        !isEqual(record.runStatus, prevRecord.runStatus),
      width: 150,
      render(_, record) {
        const { result: enabled } = canExecuteTestRun(record.designee);
        return (
          <StatusBadge
            useRootContainer
            readonly={!enabled}
            status={record.runStatus}
            onStatusChange={status => handleTestRunStatusChange(record, status)}
          />
        );
      },
    },
    {
      key: 'executor',
      title: t('page.plan.testEntityList.executor'),
      shouldCellUpdate: (record, prevRecord) =>
        !isEqual(record.executor?.[0], prevRecord.executor?.[0]),
      width: 150,
      render(_, record) {
        return <Field.User readonly userInfo={record?.executor?.[0]} />;
      },
    },
    {
      key: 'designee',
      title: t('page.plan.testEntityList.designee'),
      width: 150,
      render(_, record) {
        return <Field.User userInfo={record?.designee} />;
      },
    },
    {
      key: 'action',
      title: t('common.action'),
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
                {t('common.run')}
              </Button>
            </Tooltip>
            <Button
              type="link"
              style={{ marginLeft: 10 }}
              disabled={getCreatePermission(TestType.Case)}
              onClick={async () => {
                deleteTestRunByIds([record.objectId]);
              }}
            >
              {t('common.delete')}
            </Button>
          </div>
        );
      },
    },
  ];

  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      if (hasRowSelected) {
        actionConfirm(
          {
            title: t('common.tip'),
            okText: t('common.okText'),
            cancelText: t('common.cancel'),
            content: t('page.plan.testEntityList.removeCaseTips1'),
          },
          async () => {
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
            const res = await updateTestEntity(
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
            if (res?.status === 'error') {
              setTableLoading(false);
              message.error(res.data);
              return;
            }

            setTimeout(() => {
              scopedTestDetailRefresh();
              actionRef.current.resetSelectedRowKeys();
              tableSelectionToggleEvent.emit(false);
              setTableLoading(false);
            }, 500);
          },
        );
      }
    };

    // 更新负责人
    const handleAssigneeChange = async assignee => {
      setTableLoading(true);
      const testIds = actionRef.current.selectedRowKeys;

      const res = await updateTestEntity(
        testIds.map(d => ({
          objectId: d,
          values: {
            assignee,
          },
        })),
      );
      if (res?.status === 'error') {
        setTableLoading(false);
        message.error(res.data);
        return;
      }

      setTimeout(() => {
        actionRef.current.refresh();
        mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
      }, 1000);

      setTableLoading(false);
      notification.success({
        message: `${testIds.length} ${t('page.plan.testEntityList.updateAssigneeTips')}`,
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
          <span className={cx('user-field')}>
            <UserOutlined /> {t('page.plan.testEntityList.assigneeSetting')}
          </span>
        }
      />,

      <span key="delete" onClick={() => hasRowSelected && handleDelete()}>
        <DeleteOutlined /> {t('common.remove')}
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
    t,
  ]);

  const InnerTableSelectionActionNodes = React.useMemo(() => {
    const getTestRunIds = () => actionRef.current.selectedRowKeys;

    const toggleSTestRunStatus = async status => {
      if (getCreatePermission(TestType.Case)) {
        message.error(t('page.plan.testEntityList.editorItemTips'));
        return;
      }
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
        message: t('page.plan.testEntityList.updateRunStateTips'),
      });
      setTableLoading(false);
      actionRef.current.refresh();
      mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
      mutateStatusEvent.emit('refreshExecutionStatus');
      // refreshAndMutateData();
    };

    const deleteTestRun = () => {
      if (getCreatePermission(TestType.Case)) {
        message.error(t('page.plan.testEntityList.deleteItemTips'));
        return;
      }
      const testRunIds = getTestRunIds();
      deleteTestRunByIds(testRunIds);
    };

    // 更新测试执行人
    const handleDesigneeChange = async users => {
      if (getCreatePermission(TestType.Case)) {
        message.error(t('page.plan.testEntityList.deleteItemTips'));
        return;
      }
      const testRunIds = getTestRunIds();
      setTableLoading(true);
      // 更新测试执行执行人
      const res = await updateTestEntity(
        testRunIds.map(run => ({
          objectId: run,
          designee: users,
        })),
      );
      if (res?.status === 'error') {
        setTableLoading(false);
        message.error(res.data);
        return;
      }

      notification.success({
        message: t('page.plan.testEntityList.updateDesigneeStateTips'),
      });
      setTableLoading(false);
      actionRef.current.refresh();
      mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
      mutateStatusEvent.emit('refreshExecutionStatus');
      // refreshAndMutateData();
    };

    const canDesigneeSelect = canAssignTestRun();

    return [
      <Tooltip
        key="assignee"
        title={canDesigneeSelect ? null : t('page.plan.testEntityList.notUpdateDesignee')}
      >
        <span className={cx(!canDesigneeSelect && 'disabled')}>
          <UserCell
            value={[]}
            mode="multiple"
            userData={userData}
            readonly={!canDesigneeSelect || !hasRowSelected}
            onChange={handleDesigneeChange}
            emptyChild={
              <span className="user-field">
                <UserOutlined /> {t('page.plan.testEntityList.updateDesignee')}
              </span>
            }
          />
        </span>
      </Tooltip>,
      <StatusBadge
        useRootContainer
        readonly={!hasRowSelected && getCreatePermission(TestType.Case)}
        onStatusChange={toggleSTestRunStatus}
        key="toggleRunStatus"
        emptyNode={
          <span>
            <FlagOutlined /> {t('page.plan.testEntityList.updateRunStatus')}
          </span>
        }
      />,

      <span key="delete" onClick={() => hasRowSelected && deleteTestRun()}>
        <DeleteOutlined /> {t('common.delete')}
      </span>,
    ];
  }, [
    canAssignTestRun,
    userData,
    hasRowSelected,
    getCreatePermission,
    getCanExecuteTestRunIdSequence,
    selectedTestPlan?.objectId,
    mutateTestPlanEvent,
    mutateStatusEvent,
    deleteTestRunByIds,
    t,
  ]);

  tableSelectionToggleEvent.useSubscription(visible => {
    actionRef.current.toggleSelection(visible);
    actionRef.current.resetSelectedRowKeys();
  });

  const handleFilterField = useCallback(
    async ({ testType, fieldKeys }) => {
      await saveUserSetting({
        workspaceKey,
        user: currentUser,
        testType,
        filterFields: {
          ...(currentFields?.filterFields ?? {}),
          [testType]: fieldKeys,
        },
      });
    },
    [currentUser, workspaceKey, currentFields],
  );

  return (
    <div className={cx('test-entity-list-box')}>
      {activeType === 'TestPlan' ? (
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
          privateColumnKey={['repositoryGroup', 'caseLatestStatus', 'runCount']}
          rowKey="objectId"
          columns={allTestColumns}
          name={`${workspaceKey}_AllTestEntity`}
          actionRef={actionRef}
          loading={tableLoading || loading}
          getDataSource={testPlanTableDataGetter}
          onHasRowSelected={setHasRowSelected}
          allSelectableRowKeys={requestScopedTestDetailIds}
          selectionActionNodes={selectionActionNodes}
          onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
          handleFilterField={handleFilterField}
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
          privateColumnKey={['repositoryGroup', 'runStatus', 'executor', 'designee']}
          rowKey="objectId"
          columns={executionColumns}
          name={`${workspaceKey}_TestExecutionList`}
          actionRef={actionRef}
          loading={tableLoading || loading}
          getDataSource={executionTableDataGetter}
          onHasRowSelected={setHasRowSelected}
          allSelectableRowKeys={testIdSequence}
          selectionActionNodes={InnerTableSelectionActionNodes}
          onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
          handleFilterField={handleFilterField}
        />
      )}
      {activeType !== 'TestPlan' && (
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
