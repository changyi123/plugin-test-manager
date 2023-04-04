import React, { useCallback, useEffect, useState } from 'react';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import Field from '@/components/common/Field';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
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
import { TestLinkType, TestType } from 'common/constant';
import { TestCaseStatusModel, TestRunDesigneeModel, TestRunExecutorModel } from '@/lib/constants';
import { has, isEmpty, isEqual, omit, pick } from 'lodash';
import { useTestRunActionAuth, useCanExecuteTestRunIdSequence } from '@/lib/hooks/useTest';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { useCurrentUser } from '@/lib/api/user';
import { useBaseAction } from '@/lib/hooks/useContext';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import useI18n from '@/lib/hooks/useI18n';
import { getTestCaseStatusModelValue, handleCustomerSelector } from '@/lib/utils/iql';

import cx from './index.less';
import { getRepositoryQuery } from '@/lib/utils/tree';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';

interface TestEntityListProps {
  loading?: boolean;
  activeType: string;
  selectedExecution?: Record<string, any>;
  refreshPlanData?: () => void;
  refreshTreeAndScopeTestCase?: () => void;
  tableSelectionVisible?: boolean;
  selectNode?: Record<string, any>;
}

const getTestRunSelector = customSelector => {
  if (
    has(customSelector, [TestRunDesigneeModel]) ||
    has(customSelector, [TestRunExecutorModel]) ||
    has(customSelector, [TestCaseStatusModel])
  ) {
    return pick(customSelector, [TestRunDesigneeModel, TestRunExecutorModel, TestCaseStatusModel]);
  }
  return;
};

const TestEntityList: React.FC<TestEntityListProps> = ({
  loading,
  activeType,
  selectedExecution,
  refreshTreeAndScopeTestCase,
  tableSelectionVisible,
  selectNode,
}) => {
  const {
    workspaceKey,
    selectors,
    selectedTestPlan,
    registerRefreshMethod,
    mutateStatusEvent,
    planLinkCaseIds: scopedTestCaseIds,
    executionLinkRunIds,
    runLinkCaseIds,
    tableSelectionToggleEvent,
    getTestCaseRepositoryPath,
  } = usePageContext();
  const { t } = useI18n();
  const proxima = createProximaSdk();
  const { getCreatePermission, testCaseFieldKeys } = useBaseAction();
  const actionRef = React.useRef<BusinessTableActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();
  const userData = useUserCellUserDataProp(workspaceKey);
  const { canExecuteTestRun, canAssignTestRun } = useTestRunActionAuth({ workspaceKey });
  const { data: currentUser } = useCurrentUser();
  const { getCanExecuteTestRunIdSequence } = useCanExecuteTestRunIdSequence({ workspaceKey });

  const [tableLoading, setTableLoading] = useState(false);
  const [hasRowSelected, setHasRowSelected] = useState(false);

  React.useEffect(() => {
    registerRefreshMethod({
      detailTable: actionRef.current?.refresh,
    });
  }, [registerRefreshMethod]);

  // 事项数据更新后刷新列表
  useListener('updateItemList', props => {
    if (props?.type === 'create') return;
    if (props?.type === 'delete') {
      refreshTreeAndScopeTestCase?.();
    }
    setTimeout(() => {
      actionRef.current.refresh();
    }, 400);
  });

  useListener('updateTestRunStatus', () => {
    actionRef.current.refresh();
  });

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
      if (
        !selectNode?.key ||
        !workspaceKey ||
        activeType === 'TestExecution' ||
        !testCaseFieldKeys.length
      ) {
        return {
          list: [],
          total: 0,
        };
      }
      setTableLoading(true);

      // 处理测试用例最新状态筛选
      const query: Record<string, any> = {};
      const { selector, runStatusSelector } = handleCustomerSelector(selectors);
      if (runStatusSelector[TestCaseStatusModel]?.value?.length) {
        const params = getTestCaseStatusModelValue(runStatusSelector);
        const { data: ids } = await getCasesByStatus({
          planId: selectedTestPlan.objectId,
          ...params,
        });
        query.id = ids;
      }

      // 查询测试用例
      query.repository = getRepositoryQuery(selectNode, 'all')?.repository;
      const { list: testDetails, total } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          ...query,
        },
        ...queryParams,
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [selectedTestPlan.objectId],
        destinationType: TestType.Case,
        fields: [].concat(SystemFieldKeys, testCaseFieldKeys),
        selector,
      });

      // 查询统计数据
      const stats = await getTestCaseStats({
        planId: selectedTestPlan.objectId,
        select: ['runCount', 'caseLatestStatus'],
        caseIds: testDetails.map(d => d.id),
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
      selectNode,
      workspaceKey,
      activeType,
      testCaseFieldKeys,
      selectors?.toString(),
      selectedTestPlan?.objectId,
    ],
  );

  const getTableDataByFilterRun = async params => {
    const {
      workspaceKey,
      executionLinkRunIds,
      executionId,
      selector,
      filterRunSelector,
      queryParams,
      caseFieldKeys,
      selectNode,
    } = params;

    // 先筛选测试执行后查询测试用例
    const { list: runs } = await getLinkedTestEntityByQuery({
      query: {
        workspaceKey: workspaceKey,
        id: executionLinkRunIds,
      },
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: [executionId],
      destinationType: TestType.Run,
      select: ['id', 'referenceCase', 'designee', 'executor', 'sortIndex', 'status'],
      selector: [{}, filterRunSelector],
    });

    const runCaseMap = new Map();
    runs.forEach(d => {
      runCaseMap.set(d.referenceCase, d);
    });
    const repository = getRepositoryQuery(selectNode, 'all');
    const { list: cases, total } = await getTestEntityByQuery({
      query: {
        workspaceKey: workspaceKey,
        type: TestType.Case,
        id: [...runCaseMap.keys()],
        ...repository,
      },
      fields: caseFieldKeys ?? [],
      selector,
      ...queryParams,
    });
    setTableLoading(false);

    return {
      list: cases?.map(c => {
        const runData = pick(runCaseMap.get(c.id), [
          'id',
          'referenceCase',
          'designee',
          'executor',
          'status',
        ]);

        return {
          ...c,
          ...runData,
          status: c.workflowStatus,
          runStatus: runData.status,
          runId: runData.id,
          caseId: c.id,
          objectId: runData.id,
          repository: c.repository,
        };
      }),
      total,
    };
  };
  const getTableDataByFilterCase = async params => {
    const {
      workspaceKey,
      runLinkCaseIds,
      executionId,
      selector,
      queryParams,
      caseFieldKeys,
      selectNode,
    } = params;

    const repository = getRepositoryQuery(selectNode, 'all');
    const { list: cases, total } = await getTestEntityByQuery({
      query: {
        workspaceKey: workspaceKey,
        type: TestType.Case,
        id: runLinkCaseIds,
        ...repository,
      },
      fields: caseFieldKeys ?? [],
      selector,
      ...queryParams,
    });

    const { list: runs } = await getLinkedTestEntityByQuery({
      query: {
        workspaceKey: workspaceKey,
        referenceCase: cases.map(d => d.id),
      },
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: [executionId],
      destinationType: TestType.Run,
      select: ['id', 'referenceCase', 'designee', 'executor', 'sortIndex', 'status'],
    });

    const runCaseMap = new Map();
    runs.forEach(d => {
      runCaseMap.set(d.referenceCase, d);
    });
    setTableLoading(false);

    return {
      list: cases?.map(c => {
        const runData = pick(runCaseMap.get(c.id), [
          'id',
          'referenceCase',
          'designee',
          'executor',
          'status',
        ]);

        return {
          ...c,
          ...runData,
          status: c.workflowStatus,
          runStatus: runData.status,
          caseId: c.id,
          objectId: runData.id,
          repository: c.repository,
        };
      }),
      total,
    };
  };

  // 获取执行任务 getter
  const executionTableDataGetter = useCallback(
    async queryParams => {
      if (
        !selectedExecution?.objectId ||
        !executionLinkRunIds?.length ||
        !selectNode?.key ||
        activeType === 'TestPlan' ||
        !testCaseFieldKeys.length
      )
        return {
          list: [],
          total: 0,
        };

      const [systemSelectors, customSelector] = selectors;
      const filterCaseSelector = omit(customSelector, [
        TestRunDesigneeModel,
        TestRunExecutorModel,
        TestCaseStatusModel,
      ]);
      const filterRunSelector = getTestRunSelector(customSelector);

      if (filterRunSelector) {
        return await getTableDataByFilterRun({
          workspaceKey,
          executionLinkRunIds,
          executionId: selectedExecution.objectId,
          filterRunSelector: filterRunSelector,
          selector: [systemSelectors, filterCaseSelector],
          queryParams,
          caseFieldKeys: [].concat(SystemFieldKeys, testCaseFieldKeys),
          selectNode,
        });
      }

      return await getTableDataByFilterCase({
        workspaceKey,
        runLinkCaseIds,
        executionId: selectedExecution.objectId,
        selector: [systemSelectors, filterCaseSelector],
        queryParams,
        caseFieldKeys: [].concat(SystemFieldKeys, testCaseFieldKeys),
        selectNode,
      });
    },
    [
      selectedExecution?.objectId,
      executionLinkRunIds,
      selectNode,
      activeType,
      selectors?.toString(),
      workspaceKey,
      runLinkCaseIds,
      testCaseFieldKeys,
    ],
  );

  useEffect(() => {
    const [systemSelectors] = selectors ?? [];
    if (!isEmpty(systemSelectors) && activeType !== 'TestPlan') {
      setTableLoading(true);
      // scopedTestDetailRefresh();
      const isEmptyValue = Object.values(systemSelectors)
        .map(d => d?.value)
        .filter(Boolean);
      // 筛选器有 tag 值为空时取消 loading
      if (isEmptyValue.length) {
        setTableLoading(false);
      }
    }
  }, [selectors, activeType]);

  const addAndDeleteRefresh = useCallback(async () => {
    // 重置 RowKeys
    actionRef.current.resetSelectedRowKeys();
    // 刷新左侧树，表格依赖刷新，刷新获取全部id
    await refreshTreeAndScopeTestCase();
  }, [refreshTreeAndScopeTestCase]);

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
          caseStatus: omit(d.caseStatus ?? {}, [planId]),
        })),
      );
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }
      await addAndDeleteRefresh();
      notification.success({
        message: `${testDetails.length} ${t('page.plan.testEntityList.removeCaseMessage')}`,
      });
      proxima.execute('refreshSelectedNode');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addAndDeleteRefresh, t],
  );

  const allTestColumns = React.useMemo(() => {
    return [
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
          return (
            <span>{getTestCaseRepositoryPath?.(rowData?.repository) ?? t('common.unGrouped')}</span>
          );
        },
      },
      {
        key: 'caseLatestStatus',
        title: t('page.plan.testEntityList.runStatus'),
        width: 200,
        render(_, rowData) {
          return (
            <StatusBadge readonly status={rowData.caseLatestStatus} className={cx('cell-min')} />
          );
        },
      },
      {
        key: 'caseLatestExecutor',
        title: t('page.plan.testEntityList.executor'),
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
  }, [getTestCaseRepositoryPath, removeTestRelation, t]);

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

        // 删除刷新
        setTimeout(() => {
          addAndDeleteRefresh();
          actionRef.current?.refresh();
        }, 500);
        mutateStatusEvent.emit('refreshExecutionStatus');
        notification.success({
          message: `${testRunIds.length} ${t('page.plan.testEntityList.deleteRunMessage')}`,
        });
        proxima.execute('refreshTestRunPanel');
        proxima.execute('refreshSelectedNode');
      },
    );
  });

  // const testIdSequence = allRunData
  //   ?.filter(run => requestScopedTestDetailIds?.includes(run.referenceCase))
  //   ?.map(run => run.id)
  //   .filter(Boolean);

  const executionColumns = React.useMemo(
    () => [
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
            openItemViewScreen(record?.caseId);
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
          return <span>{getTestCaseRepositoryPath(rowData.repository)}</span>;
        },
      },
      {
        key: 'runStatus',
        title: t('page.plan.testEntityList.runStatus'),
        shouldCellUpdate: (record, prevRecord) =>
          !isEqual(record.designee, prevRecord.designee) ||
          !isEqual(record.runStatus, prevRecord.runStatus),
        width: 200,
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
                      testId: record.id,
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
                  deleteTestRunByIds([record.id]);
                }}
              >
                {t('common.delete')}
              </Button>
            </div>
          );
        },
      },
    ],
    [
      canExecuteTestRun,
      deleteTestRunByIds,
      getCreatePermission,
      getTestCaseRepositoryPath,
      handleTestRunStatusChange,
      mutateStatusEvent,
      t,
    ],
  );

  // 全部用例批量操作
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
              limit: 9999,
              select: ['id', 'caseStatus'],
            });
            const res = await updateTestEntity(
              items.map(item => ({
                objectId: item.id,
                linkItems: {
                  action: 'delete',
                  value: [selectedTestPlan?.objectId],
                },
                caseStatus: omit(item.caseStatus ?? {}, [selectedTestPlan?.objectId]),
              })),
            );
            if (res?.status === 'error') {
              setTableLoading(false);
              message.error(res.data);
              return;
            }

            await addAndDeleteRefresh();
            setTableLoading(false);
            proxima.execute('refreshSelectedNode');
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
      actionRef.current.refresh();

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
  }, [userData, hasRowSelected, t, workspaceKey, addAndDeleteRefresh, selectedTestPlan?.objectId]);

  // 测试执行任务批量操作
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
      const res = await updateTestStatus({
        status: status.key,
        runIds: canExecuteTestRunIds,
        planId: selectedTestPlan?.objectId,
      });
      if (res) {
        notification.success({
          message: t('page.plan.testEntityList.updateRunStateTips'),
        });
        actionRef.current.refresh();
        // mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
        mutateStatusEvent.emit('refreshExecutionStatus');
      }
      setTableLoading(false);
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
      // mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
      // mutateStatusEvent.emit('refreshExecutionStatus');
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
          allSelectableRowKeys={scopedTestCaseIds}
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
          allSelectableRowKeys={executionLinkRunIds}
          selectionActionNodes={InnerTableSelectionActionNodes}
          onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
          handleFilterField={handleFilterField}
        />
      )}
      {activeType !== 'TestPlan' && (
        <TestRunModal
          actionRef={testRunModalActionRef}
          idSequence={executionLinkRunIds}
          selectedTestPlanId={selectedTestPlan.objectId}
        />
      )}
    </div>
  );
};

export default TestEntityList;
