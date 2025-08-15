/* eslint-disable react-hooks/exhaustive-deps */
import { DeleteOutlined, FlagOutlined, UserOutlined } from '@ant-design/icons';
import { useListener } from '@projectproxima/proxima-sdk-js';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, message, notification, Tooltip } from 'antd';
import { TestFiledKeyMapping, TestLinkType, TestType } from 'common/constant';
import dayjs from 'dayjs';
import { isEmpty, isEqual, keyBy, omit, pick } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteRunWithProcess,
  removeCaseFromPlanWithProcess,
  updateItemsWithProcess,
} from '@/components/business/BatchResult/hooks';
import RenderRepository from '@/components/business/RenderRepository';
import { StatusBadge } from '@/components/business/Status';
import TestBatchUpdateExeModal, {
  TestBatchUpateModalActionRef,
} from '@/components/business/TestBatchUpdateExeModal';
import TestRunModal, {
  ActionType as TestRunModalActionType,
  VERSION,
} from '@/components/business/TestRunModal';
import { useItemLinkTypeConfig } from '@/components/business/TestRunModal/hooks';
import UserCell from '@/components/business/UserCell';
import { BusinessTable } from '@/components/common/BusinessTable';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { useStepAfterUpdateItemList } from '@/components/common/BusinessTable/hook';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import Field from '@/components/common/Field';
import {
  addTestDefect,
  batchUpdateCase,
  getCasesByStatus,
  getLinkedTestEntityByQuery,
  getTestCaseStats,
  getTestEntityByQuery,
  getUpdateParams,
  handleSelector,
  updateTestEntity,
  updateTestStatus,
} from '@/lib/api/item';
import { openBaseLineViewItemModal } from '@/lib/api/sdk';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { getAppEnv } from '@/lib/appEnv';
import { featureFlags, SupportFeatureFlags } from '@/lib/appEnv';
import {
  CASESNAPSHOT_TYPE,
  TestCaseStatusModel,
  TestRunDesigneeModel,
  TestRunExecutorModel,
} from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import { useCanExecuteTestRunIdSequence, useTestRunActionAuth } from '@/lib/hooks/useTest';
import { checkRunStatus } from '@/lib/utils/checkRunStatus';
import fetch from '@/lib/utils/fetch';
import { getDefectDefautFieldConfig } from '@/lib/utils/getDefectDefautFieldConfig';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import {
  getTestCaseStatusModelValue,
  handleCustomerSelector,
  selectorToIql,
  withWorkspace,
} from '@/lib/utils/iql';
import { getRepositoryQuery } from '@/lib/utils/tree';
import TableCellTestDetailForm from '@/modules/beforeCreateOrUpdateModal/TableCellTestDetailForm';
import TableCellTestDetailFormReadOnly from '@/modules/beforeCreateOrUpdateModal/TableCellTestDetailFormReadOnly';

import { usePageContext } from '../hook';
import { getTestRunSelector } from '../PlanPageLayout/helps';
import {
  useGetFilterExecutionLinkCaseRunIds,
  useGetFilterPlanLinkCaseIds,
} from '../PlanPageLayout/hooks';
import cx from './index.less';

interface TestEntityListProps {
  loading: boolean;
  activeType: string;
  showType?: string;
  refreshPlanData?: () => void;
  tableSelectionVisible?: boolean;
  selectNode?: Record<string, any>;
  selectedExecution?: Record<string, any>;
  refreshTreeAndScopeTestCase?: () => void;
}

const useFnHookTriggerFn = (fn, before, after) => {
  return React.useCallback(
    async (...args) => {
      let res;
      try {
        before?.();
        res = await fn?.(...args);
      } catch (err) {
        console.error(err);
      }
      after?.();
      return res;
    },
    [fn],
  );
};

const TestEntityList: React.FC<TestEntityListProps> = ({
  loading: loadingFromParentElement,
  showType,
  activeType,
  selectNode,
  selectedExecution,
  refreshTreeAndScopeTestCase,
  tableSelectionVisible,
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
    runLinkSnapshotIds,
    runMap,
    runSnapshotMap,
    tableSelectionToggleEvent,
    mutateTestTableList,
  } = usePageContext();
  const { t } = useI18n();
  const enableRepositoryTableStep = featureFlags(SupportFeatureFlags.ENABLE_REPOSITORY_TABLE_STEP);
  const proxima = createProximaSdk();
  const { config } = useTestConfig();
  const { getCreatePermission, testCaseFieldKeys, globalTestConfig, createItemUseModal } =
    useBaseAction();
  const { TestToDefect = '' } = useItemLinkTypeConfig();

  const actionRef = React.useRef<BusinessTableActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();
  const testBatchUpateModalActionRef = React.useRef<TestBatchUpateModalActionRef>(); // 批量更新执行用例
  const userData = useUserCellUserDataProp(workspaceKey);
  const { canExecuteTestRun, canAssignTestRun } = useTestRunActionAuth({ workspaceKey });
  const { data: currentUser } = useCurrentUser();
  const { getCanExecuteTestRunIdSequence } = useCanExecuteTestRunIdSequence({ workspaceKey });

  const [tableLoading, setTableLoading] = useState(false);
  const [hasRowSelected, setHasRowSelected] = useState(false);
  const currentRunRef = useRef(null);
  const loading = loadingFromParentElement || tableLoading;

  // 批量更新执行用例
  const [batchUpdateLoading, setBatchUpdateLoading] = useState(false);

  const statusesConfig = React.useMemo(() => {
    return keyBy(globalTestConfig?.statuses ?? [], 'key');
  }, [globalTestConfig]);

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
    refreshTreeAndScopeTestCase?.();
  });

  // 修改弹窗的步骤后，更新table的数据
  const { enableCacheEpandedRowKeys } = useStepAfterUpdateItemList({
    selectNodeKey: selectNode?.key,
    refresh: () => {
      actionRef.current.refresh();
    },
  });

  const { data: currentFields } = useRequest(
    async () => {
      return await getCurrentUserSetting({
        workspaceKey,
        user: currentUser as unknown as Parse.Pointer,
      });
    },
    {
      refreshDeps: [workspaceKey, currentUser],
    },
  );

  // 获取筛选后的测试计划关联的测试用例 ID
  const { data: allPlanRowKeys } = useGetFilterPlanLinkCaseIds({
    workspaceKey,
    type: 'TestPlan',
    id: scopedTestCaseIds,
    selectNode,
    selectors,
  });

  // 获取全部用例 getter
  const testPlanTableDataGetter = useFnHookTriggerFn(
    useCallback(
      async queryParams => {
        if (
          !selectNode?.key ||
          !workspaceKey ||
          activeType === 'TestExecution' ||
          !testCaseFieldKeys
        ) {
          return {
            list: [],
            total: 0,
          };
        }
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
        query.repository = getRepositoryQuery(selectNode, showType)?.repository;
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
          fields: [].concat(SystemFieldKeys, testCaseFieldKeys ?? []),
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
        JSON.stringify(selectors),
        selectedTestPlan?.objectId,
        showType,
      ],
    ),
    () => {
      setTableLoading(true);
    },
    () => {
      setTableLoading(false);
    },
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
      showType,
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
      limit: 99999,
      select: [
        'id',
        'referenceCase',
        'referenceCaseSnapshot',
        'designee',
        'executor',
        'sortIndex',
        'status',
        'executeCount',
        'executeTime',
      ],
      selector: [{}, filterRunSelector],
    });

    const runCaseMap = new Map();
    runs.forEach(d => {
      runCaseMap.set(d.referenceCase, d);
    });
    const repository = getRepositoryQuery(selectNode, showType);
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

    return {
      list: cases?.map(c => {
        const runData = pick(runCaseMap.get(c.id), [
          'id',
          'referenceCase',
          'referenceCaseSnapshot',
          'designee',
          'executor',
          'status',
          'executeCount',
          'executeTime',
        ]);

        return {
          ...c,
          ...runData,
          status: c.workflowStatus,
          runStatus: runData.status,
          runId: runData.id,
          caseId: c.id,
          objectId: runData.id,
          id: runData.id,
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
      runLinkSnapshotIds,
      runMap,
      runSnapshotMap,
      executionId,
      selector,
      queryParams,
      caseFieldKeys,
      selectNode,
      showType,
    } = params;

    const repository = getRepositoryQuery(selectNode, showType);

    // todo 这个地方可能还是有问题， 后期在优化
    // 对 referenceCase 和 referenceCaseSnapshot 字段分组，后面 selector 使用
    const remainingCaseIds = [];
    for (const caseId of Object.keys(runMap)) {
      if (runSnapshotMap[caseId] === undefined) {
        remainingCaseIds.push(runMap[caseId]);
      }
    }

    // 筛选条件作用在测试用例，所以需要先查询出所有的测试用例，再查出测试执行
    const searchParams = {
      query: {
        workspaceKey: workspaceKey,
        type: TestType.Case,
        // id: runLinkCaseIds,
        ...repository,
      },
      fields: caseFieldKeys ?? [],
      selector,
      ...queryParams,
    };
    let iql = '';
    if (remainingCaseIds.length > 0) {
      iql += `id in [${remainingCaseIds.map(id => `'${id}'`).join(',')}]`;
    }

    if (runLinkSnapshotIds.length) {
      iql += remainingCaseIds?.length ? ' or ' : '';
      iql += `(id in [${runLinkSnapshotIds
        .map(id => `'${id}'`)
        .join(',')}] and 'baseLineSources' in ['BaseLineItemVersion'])`;
    }

    const _transferIQL = selectorToIql(handleSelector(selector));
    if (selector && _transferIQL) {
      iql += ` and ${_transferIQL}`;
    }

    searchParams.selector = iql || '';

    const { list: cases, total } = await getTestEntityByQuery(searchParams);

    console.info('cases', cases);
    const caseSearchParams = {
      query: {
        workspaceKey: workspaceKey,
      } as any,
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: [executionId],
      limit: 99999,
      destinationType: TestType.Run,
      select: [
        'id',
        'referenceCase',
        'referenceCaseSnapshot',
        'designee',
        'executor',
        'sortIndex',
        'executeCount',
        'executeTime',
        'status',
        'runDetail',
      ],
      selector: '',
    };

    const referenceCase = [];
    const referenceCaseSnapshot = [];
    cases.forEach(i => {
      if (i.itemId) {
        referenceCaseSnapshot.push(i.id);
      } else {
        referenceCase.push(i.id);
      }
    });

    let iql2 = '';
    if (referenceCase.length > 0) {
      iql2 += `'test_manager_referenceCase' in [${referenceCase.map(id => `'${id}'`).join(',')}]`;
    }

    if (referenceCaseSnapshot.length) {
      iql2 += remainingCaseIds?.length ? ' or ' : '';
      iql2 += `('test_manager_referenceCaseSnapshot' in [${referenceCaseSnapshot
        .map(id => `'${id}'`)
        .join(',')}])`;
    }

    if (iql2) {
      caseSearchParams.selector = iql2;
    }

    console.info('caseSearchParams', caseSearchParams);

    const { list: runs } = await getLinkedTestEntityByQuery(caseSearchParams as any);

    const runCaseMap = new Map();
    runs.forEach(d => {
      runCaseMap.set(d.referenceCaseSnapshot ? d.referenceCaseSnapshot : d.referenceCase, d);
    });

    console.info('runs', runs);
    const result = {
      list: cases?.map(c => {
        const runData = pick(runCaseMap.get(c.id), [
          'id',
          'itemId',
          'referenceCase',
          'referenceCaseSnapshot',
          'designee',
          'executor',
          'status',
          'executeCount',
          'executeTime',
          'runDetail',
        ]);
        return {
          ...c,
          ...runData,
          referenceCase: runData.referenceCase,
          referenceCaseSnapshot: runData.referenceCaseSnapshot,
          runDetail: runData.referenceCaseSnapshot ? runData.runDetail : c.detail,
          status: c.workflowStatus,
          runStatus: runData.status,
          caseId: c.itemId || c.id,
          objectId: runData.id,
          id: runData.id,
          repository: c.repository,
          // baseLineItemVersion: c.baseLineItemVersion,
        };
      }),
      total,
    };
    console.info('result', result);
    return result;
  };

  const getExecutionTableData = useCallback(
    async queryParams => {
      const EmptyListData = {
        list: [],
        total: 0,
      } as const;

      if (
        !selectedExecution?.objectId ||
        !executionLinkRunIds?.length ||
        activeType === 'TestPlan' ||
        !testCaseFieldKeys
      )
        return EmptyListData;

      const caseFieldKeys = [].concat(SystemFieldKeys, testCaseFieldKeys ?? []);
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
          filterRunSelector,
          selector: [systemSelectors, filterCaseSelector],
          queryParams,
          caseFieldKeys,
          selectNode,
          showType,
        });
      }

      return await getTableDataByFilterCase({
        workspaceKey,
        runLinkCaseIds,
        runLinkSnapshotIds,
        runMap,
        runSnapshotMap,
        executionId: selectedExecution.objectId,
        selector: [systemSelectors, filterCaseSelector],
        queryParams,
        caseFieldKeys: caseFieldKeys.concat(['itemId']),
        selectNode,
        showType,
      });
    },
    [
      selectedExecution?.objectId,
      executionLinkRunIds,
      selectNode,
      activeType,
      testCaseFieldKeys,
      JSON.stringify(selectors),
      workspaceKey,
      runLinkCaseIds,
      runLinkSnapshotIds,
      showType,
    ],
  );

  // 获取执行任务 getter
  const executionTableDataGetter = useFnHookTriggerFn(
    getExecutionTableData,
    () => {
      setTableLoading(true);
    },
    () => {
      setTableLoading(false);
    },
  );

  // 获取筛选后的测试执行关联的测试执行 ID
  const { data: runRowKeys } = useGetFilterExecutionLinkCaseRunIds({
    workspaceKey,
    type: 'TestExecution',
    runId: executionLinkRunIds,
    runLinkCaseId: runLinkCaseIds,
    runLinkSnapshotIds,
    selectNode,
    selectors,
    executionId: selectedExecution?.objectId,
  });

  useEffect(() => {
    const [systemSelectors] = selectors ?? [];
    if (!isEmpty(systemSelectors) && activeType !== 'TestPlan') {
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
    setTimeout(() => {
      refreshTreeAndScopeTestCase();
    }, 500);
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

  //  测试计划--全部用例表头
  const allTestColumns = React.useMemo(() => {
    return [
      {
        width: 400,
        key: 'title',
        fixed: true,
        isSystem: true,
        title: t('common.title'),
        sorter: {
          compare: (a, b) => {
            return a.name.length - b.name.length;
          },
        },
        className: 'test-case-title',
        extraProps: {
          onClick: record => {
            openItemViewScreen(record?.objectId);
          },
        },
        shouldCellUpdate: (record, prevRecord) => {
          return (
            record.repository?.objectId !== prevRecord.repository?.objectId ||
            record.name !== prevRecord.name
          );
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
      // 所属模块
      {
        key: 'repositoryGroup',
        title: t('page.plan.testEntityList.repositoryGroup'),
        sorter: {
          compare: (a, b) => {
            return +new Date(a.createdAt) - +new Date(b.createdAt);
          },
        },
        width: 200,
        render(_, rowData) {
          return <RenderRepository repository={rowData?.repository} />;
        },
      },
      // 测试执行状态
      {
        key: 'caseLatestStatus',
        title: t('page.plan.testEntityList.runStatus'),
        sorter: {
          compare: (a, b) => {
            return (a.caseLatestStatus || '').localeCompare(b.caseLatestStatus || '');
          },
        },
        width: 200,
        render(_, rowData) {
          return (
            <StatusBadge readonly status={rowData.caseLatestStatus} className={cx('cell-min')} />
          );
        },
      },
      // 最新执行人
      {
        key: 'caseLatestExecutor',
        title: t('page.plan.testEntityList.executor'),
        sorter: {
          compare: (a, b) => {
            return (a.caseLatestExecutor?.nickname || '').localeCompare(
              b.caseLatestExecutor?.nickname || '',
            );
          },
        },
        width: 200,
        render(_, rowData) {
          return <Field.User userInfo={rowData?.caseLatestExecutor} />;
        },
      },
      // 引用次数
      {
        key: 'runCount',
        title: <span>{t('page.plan.testEntityList.runCount')}</span>,
        sorter: {
          compare: (a, b) => {
            return a.runCount - b.runCount;
          },
        },
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
                    content: (
                      <>
                        <span>
                          {rowData.runCount
                            ? t('page.plan.testEntityList.removeCaseTips2')
                            : t('page.plan.testEntityList.removeCaseTips')}
                        </span>
                      </>
                    ),
                  },
                  () => {
                    removeTestRelation(rowData.selectedTestPlanId, [rowData]);
                  },
                );
              }}
              style={{ color: 'red' }}
            >
              {t('common.remove')}
            </a>
          );
        },
      },
    ];
  }, [removeTestRelation, t]);

  const handleTestRunStatusChange = useCallback(
    async (testRun, status) => {
      const checkStep = getAppEnv('CHECK_STEP_FOR_CHANGE_RUN_STATUS');

      if (checkStep) {
        // 校验执行步骤状态、结果描述
        const flag = checkRunStatus(testRun, status, statusesConfig, t);
        if (!flag) {
          return;
        }
      }

      // 更新测试执行状态
      // 更新测试执行对应的测试用例状态
      const res = await updateTestStatus({
        runIds: [testRun.objectId],
        status: status.key,
        planId: selectedTestPlan?.objectId,
      });
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }
      actionRef.current.refresh();
      mutateStatusEvent.emit('refreshExecutionStatus');
    },
    [mutateStatusEvent, selectedTestPlan?.objectId, statusesConfig, t],
  );

  /** 根据列表记录删除测试执行 */
  const deleteTestRunByIds = useMemoizedFn(testRunIds => {
    const enable = getAppEnv('CREATE_EXECUTION_DEFAULT_NAME_CONFIG')?.enable;

    actionConfirm(
      {
        title: t('common.tip'),
        okText: t('common.okText'),
        cancelText: t('common.cancel'),
        content: enable
          ? t('page.plan.testEntityList.deleteRunTips1')
          : t('page.plan.testEntityList.deleteRunTips'),
      },
      async () => {
        setTableLoading(true);
        // 删除测试执行
        await deleteRunWithProcess({
          ids: testRunIds,
          handleSuccess: () => {
            setTableLoading(false);
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
          handleFail: error => {
            message.error(error.message);
            setTableLoading(false);
          },
        });
      },
    );
  });
  const createDefect = useMemoizedFn(async objectId => {
    const defaultFieldConfig = await getDefectDefautFieldConfig(selectedExecution?.objectId);
    const content = null;
    const { itemList: defectItemList } = await createItemUseModal({
      type: TestType.TestDefect,
      extraData: {
        extraValues: { content },
        useItemBatchCreate: true,
      },
      ...defaultFieldConfig,
    });
    const { list: testRunData } = await getTestEntityByQuery({
      query: {
        id: [objectId],
        type: TestType.Run,
      },
      limit: 1,
    });

    // 创建事项关联
    try {
      const _currentDefectIds = testRunData[0].runDetail?.defectItemIds || [];
      const needAddedItemIds = []
        .concat(
          _currentDefectIds,
          defectItemList?.map(d => d.objectId),
        )
        .filter(Boolean);
      await addTestDefect(TestToDefect, testRunData[0], needAddedItemIds);
      setTimeout(() => actionRef.current?.refresh(), 500);
      message.success(t('components.business.testRunModal.addDefectButton.createDefectSuccess'));
    } catch (error) {
      message.error(error?.message);
    }
  });
  const executionColumns = React.useMemo(
    () => [
      //  用例标题
      {
        key: 'detailName',
        title: t('page.plan.testEntityList.detailName'),
        sorter: {
          compare: (a, b) => {
            return a.name.length - b.name.length;
          },
        },
        isSystem: true,
        fixed: true,
        className: 'test-case-title',
        width: 400,
        tooltip: true,
        shouldCellUpdate: (record, prevRecord) => {
          return (
            record.repository?.objectId !== prevRecord.repository?.objectId ||
            record.name !== prevRecord.name
          );
        },
        extraProps: {
          onClick: record => {
            if (
              record?.referenceCaseSnapshot &&
              [
                CASESNAPSHOT_TYPE.AUTO_BUILDVERSION,
                CASESNAPSHOT_TYPE.NO_BUILDVERSION_SELVERSION,
              ].includes(config?.caseSnapshot?.type)
            )
              openBaseLineViewItemModal(record?.key, record.referenceCaseSnapshot);
            else openItemViewScreen(record?.caseId);
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
      //  所属模块
      {
        key: 'repositoryGroup',
        title: t('page.plan.testEntityList.repositoryGroup'),
        width: 200,
        sorter: {
          compare: (a, b) => {
            return +new Date(a.createdAt) - +new Date(b.createdAt);
          },
        },
        render(_, rowData) {
          return <RenderRepository repository={rowData?.repository} />;
        },
      },
      // 测试执行状态
      {
        key: 'runStatus',
        title: t('page.plan.testEntityList.runStatus'),
        sorter: {
          compare: (a, b) => {
            return (a.runStatus || '').localeCompare(b.runStatus || '');
          },
        },
        shouldCellUpdate: (record, prevRecord) =>
          !isEqual(record.designee, prevRecord.designee) ||
          !isEqual(record.runStatus, prevRecord.runStatus) ||
          !isEqual(record.runDetail, prevRecord.runDetail),
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
      //  执行次数
      {
        key: 'executeCount',
        title: t('page.plan.testEntityList.executeCount'),
        sorter: {
          compare: (a, b) => {
            return (a.executeCount || '') - (b.executeCount || '');
          },
        },
        shouldCellUpdate: (record, prevRecord) =>
          !isEqual(record?.executeCount, prevRecord?.executeCount),
        width: 200,
        render(_, record) {
          return <span>{record?.executeCount ?? 0}</span>;
        },
      },
      {
        key: 'caseVersion',
        title: t('page.plan.testEntityList.caseVersion'),
        width: 120,
        overflowEllipsis: false,
        render(_, rowData) {
          return (
            <span>
              {`[${t('common.snapshot')}]` +
                (rowData.baseLineItemVersion?.name ? ` ${rowData.baseLineItemVersion?.name}` : '')}
            </span>
          );
        },
      },
      //  最新执行人
      {
        key: 'executor',
        title: t('page.plan.testEntityList.executor'),
        sorter: {
          compare: (a, b) => {
            return (a?.executor?.[0].nickname || '').localeCompare(b?.executor?.[0].nickname || '');
          },
        },
        shouldCellUpdate: (record, prevRecord) =>
          !isEqual(record.executor?.[0], prevRecord.executor?.[0]),
        width: 150,
        render(_, record) {
          return <Field.User readonly userInfo={record?.executor?.[0]} />;
        },
      },
      //  执行人
      {
        key: 'designee',
        title: t('page.plan.testEntityList.designee'),
        width: 150,
        render(_, record) {
          return <Field.User userInfo={record?.designee} />;
        },
      },
      {
        key: 'executeTime',
        title: t('modules.panel.testDetail.historyRunPanel.executeTime'),
        width: 150,
        sorter: {
          compare: (a, b) => {
            return (a.executeTime || '') - (b.executeTime || '');
          },
        },
        shouldCellUpdate: (record, prevRecord) =>
          !isEqual(record?.executeTime, prevRecord?.executeTime),
        render(_, record) {
          return record.executeTime ? dayjs(record?.executeTime).format('YYYY-MM-DD HH:mm') : '';
        },
      },
      //  操作
      {
        key: 'action',
        title: t('common.action'),
        isSystem: true,
        fixed: 'right' as any,
        width: 210,
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
                  size="small"
                  disabled={!enabled}
                  onClick={async () => {
                    currentRunRef.current = record.objectId;
                    await testRunModalActionRef.current.open({
                      testId: currentRunRef.current,
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
                size="small"
                style={{ marginLeft: 10 }}
                disabled={getCreatePermission(TestType.Case)}
                onClick={() => createDefect(record?.objectId)}
              >
                {t('components.business.testRunModal.addDefectButton.createDefect')}
              </Button>
              <Button
                type="link"
                size="small"
                style={{ marginLeft: 10, color: 'red' }}
                disabled={getCreatePermission(TestType.Case)}
                onClick={async () => {
                  deleteTestRunByIds([record.id]);
                }}
              >
                {t('common.remove')}
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
      handleTestRunStatusChange,
      mutateStatusEvent,
      config,
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
            content: (
              <>
                <span>{t('page.plan.testEntityList.removeCaseTips2')}</span>
              </>
            ),
          },
          async () => {
            // @TODO update V2 remove case from plan
            setTableLoading(true);
            await removeCaseFromPlanWithProcess({
              caseIds: actionRef.current.selectedRowKeys ?? [],
              planId: selectedTestPlan?.objectId,
              handleSuccess: () => {
                setTimeout(() => {
                  addAndDeleteRefresh();
                  actionRef.current?.refresh();
                }, 500);
                proxima.execute('refreshSelectedNode');
              },
              handleFail: error => {
                setTableLoading(false);
                message.error(error.message);
              },
            });
          },
        );
      }
    };

    // 更新负责人
    const handleAssigneeChange = async assignee => {
      const testIds = actionRef.current.selectedRowKeys;
      setTableLoading(true);
      await updateItemsWithProcess({
        items: testIds,
        fields: {
          values: { assignee },
        },
        handleSuccess: () => {
          actionRef.current.refresh();

          notification.success({
            message: `${testIds.length} ${t('page.plan.testEntityList.updateAssigneeTips')}`,
          });
        },
        handleFail: error => {
          message.error(error.message);
          actionRef.current.refresh();
        },
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

      <span className={cx('danger')} key="delete" onClick={() => hasRowSelected && handleDelete()}>
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

      // 没有可执行的测试执行时直接返回
      if (!canExecuteTestRunIds.length) {
        message.error(t('page.plan.testEntityList.noCanUpdateRunStateTips'));
        return;
      }

      // 更新测试执行状态
      const updateParams = await getUpdateParams({
        runIds: canExecuteTestRunIds,
        status: status.key,
        planId: selectedTestPlan?.objectId,
      });
      await updateItemsWithProcess({
        ...updateParams,
        handleSuccess: () => {
          notification.success({
            message: t('page.plan.testEntityList.updateRunStateTips'),
          });
          actionRef.current.refresh();
          // mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
          mutateStatusEvent.emit('refreshExecutionStatus');
        },
        handleFail: e => {
          message.error(e.message);
          // mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
          mutateStatusEvent.emit('refreshExecutionStatus');
        },
      });
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
      setTableLoading(true);
      const testRunIds = getTestRunIds();
      // 更新测试执行执行人
      await updateItemsWithProcess({
        items: testRunIds,
        fields: {
          values: { [TestFiledKeyMapping.designee]: users },
        },
        handleSuccess: () => {
          notification.success({
            message: t('page.plan.testEntityList.updateDesigneeStateTips'),
          });
          actionRef.current.refresh();
        },
        handleFail: error => {
          message.error(error.message);
          actionRef.current.refresh();
        },
      });
    };

    // 批量更新执行用例
    const batchUpdateExeCases = async () => {
      const _testRunIds: string[] = getTestRunIds() || [];
      setBatchUpdateLoading(true);

      const runVersions = _testRunIds
        .map(runId => {
          const idx = executionLinkRunIds.indexOf(runId);
          return {
            runId,
            caseId: runLinkCaseIds[idx], // 索引对应
          };
        })
        .filter(item => item.runId && item.caseId);

      if (runVersions.length !== _testRunIds.length) {
        message.error(t('page.plan.testEntityList.someItemsCannotUpdate'));
        setBatchUpdateLoading(false);
        return;
      }

      try {
        const res = await batchUpdateCase({
          runVersions: runVersions,
          workspaceKey: workspaceKey,
        });
        if (res?.status === 'ok') {
          message.success(t('common.success'));
          refreshTreeAndScopeTestCase?.();
          setTimeout(() => {
            actionRef.current.refresh();
          }, 400);
        } else {
          message.error(res?.data || t('common.error'));
        }
      } catch (error) {
        message.error(error?.message || t('common.error'));
      } finally {
        setBatchUpdateLoading(false);
      }
    };

    const canDesigneeSelect = canAssignTestRun();

    const handleBatchUpateExeCase = () => {
      if (config?.caseSnapshot?.enableCaseExeUpdate) {
        return (
          <span
            className={cx(!hasRowSelected || (batchUpdateLoading && 'disabled'))}
            key="batchUpdateExeCases"
            onClick={() => hasRowSelected && !batchUpdateLoading && batchUpdateExeCases()}
          >
            {t('components.business.testBatchUpateModel.batchUpateExeCase')}
          </span>
        );
      }
    };
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
        readonly={!hasRowSelected || getCreatePermission(TestType.Case)}
        onStatusChange={toggleSTestRunStatus}
        key="toggleRunStatus"
        emptyNode={
          <span>
            <FlagOutlined /> {t('page.plan.testEntityList.updateRunStatus')}
          </span>
        }
      />,

      <span className={cx('danger')} key="delete" onClick={() => hasRowSelected && deleteTestRun()}>
        <DeleteOutlined /> {t('common.remove')}
      </span>,
      handleBatchUpateExeCase(),
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
    config?.caseSnapshot?.enableCaseExeUpdate,
    selectedExecution?.objectId,
  ]);

  tableSelectionToggleEvent.useSubscription(visible => {
    actionRef.current.toggleSelection(visible);
    actionRef.current.resetSelectedRowKeys();
  });

  const handleFilterField = useCallback(
    async ({ testType, fieldKeys }) => {
      await saveUserSetting({
        workspaceKey,
        testType,
        filterFields: {
          ...(currentFields?.filterFields ?? {}),
          [testType]: fieldKeys,
        },
      });
    },
    [currentUser, workspaceKey, currentFields],
  );

  mutateTestTableList.useSubscription(key => {
    key === 'refreshTable' && actionRef.current.refresh();
  });

  const getNext = useCallback(async () => {
    // 目前执行下一条只支持 当前表格页
    const list = actionRef.current?.dataSource ?? [];
    let id = currentRunRef.current;
    const canExecutes = list.filter(i => {
      const { result } = canExecuteTestRun(i.designee);
      return result;
    });
    const preIndex = canExecutes.findIndex(i => id === i.id);
    const current = preIndex + 1;
    const nextIndex = current + 1;

    if (canExecutes[current]?.id) {
      id = canExecutes[current].id;
      currentRunRef.current = id;
    }

    return {
      hasNext: !!canExecutes[nextIndex]?.id,
      id,
    };
  }, []);

  return (
    <div className={cx('test-entity-list-box')}>
      {activeType === 'TestPlan' ? (
        //  测试计划--全部用例
        <BusinessTable
          className={cx(`${tableSelectionVisible ? 'batch-action' : ''}`)}
          titleCellOption={{
            workspaceKey,
            testType: TestType.Case,
            restoreWithDefaultColumnKey: true,
          }}
          useColumnSetting
          defaultColumnKey={[
            'caseLatestStatus',
            'runCount',
            'key',
            'repositoryGroup',
            'createdBy',
            'createdAt',
          ]}
          privateColumnKey={['repositoryGroup', 'caseLatestStatus', 'runCount']}
          rowKey="objectId"
          columns={allTestColumns}
          name={`${workspaceKey}_AllTestEntity`}
          actionRef={actionRef}
          loading={loading}
          getDataSource={testPlanTableDataGetter}
          onHasRowSelected={setHasRowSelected}
          allSelectableRowKeys={allPlanRowKeys}
          selectionActionNodes={selectionActionNodes}
          onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
          handleFilterField={handleFilterField}
          enableCacheEpandedRowKeys={enableCacheEpandedRowKeys}
          expandable={
            enableRepositoryTableStep && {
              expandedRowClassName: () => {
                return cx('expandedRowClassName');
              },
              expandedRowRender: record => {
                return (
                  <div className={cx('form')}>
                    <TableCellTestDetailForm
                      values={record?.detail ?? {}}
                      objectId={record?.objectId}
                    />
                  </div>
                );
              },
            }
          }
        />
      ) : (
        // 测试计划--测试执行任务
        <BusinessTable
          className={cx(`${tableSelectionVisible ? 'batch-action' : ''}`)}
          titleCellOption={{
            workspaceKey,
            testType: TestType.Case,
            restoreWithDefaultColumnKey: true,
          }}
          useColumnSetting
          defaultColumnKey={[
            'runStatus',
            'executeCount',
            'key',
            'repositoryGroup',
            'designee',
            'createdBy',
            'createdAt',
            'executor',
            'executeTime',
            'caseVersion',
          ]}
          privateColumnKey={[
            'repositoryGroup',
            'runStatus',
            'executeCount',
            'executor',
            'designee',
            'executeTime',
            'caseVersion',
          ]}
          rowKey="objectId"
          columns={executionColumns}
          name={`${workspaceKey}_TestExecutionList`}
          actionRef={actionRef}
          loading={loading}
          getDataSource={executionTableDataGetter}
          onHasRowSelected={setHasRowSelected}
          allSelectableRowKeys={runRowKeys}
          // selectionMode={true}
          selectionActionNodes={InnerTableSelectionActionNodes}
          onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
          handleFilterField={handleFilterField}
          enableCacheEpandedRowKeys={enableCacheEpandedRowKeys}
          expandable={
            enableRepositoryTableStep && {
              expandedRowClassName: () => {
                return cx('expandedRowClassName');
              },
              expandedRowRender: record => {
                const handleUpdateExe = async () => {
                  if (!record?.referenceCase) {
                    message.error(t('page.plan.testEntityList.noReferenceCase'));
                    return;
                  }
                  // 检验是否满足限制条件，与updateRunVersion保持一致
                  console.info('payload', record);
                  const updateCaseIds = [record?.caseId];
                  let iql = `'test_manager_type' = 'TestCase' and 'id' in [${updateCaseIds
                    .map(id => `'${id}'`)
                    .join(',')}]`;
                  iql += ` and ${config?.caseSnapshot?.restrictiveConditions}`;

                  if (iql) {
                    try {
                      const queryIql = withWorkspace(iql, workspaceKey);
                      const {
                        data: { payload },
                      } = await fetch.post('/parse/api/search', {
                        iql: queryIql,
                        size: 9999,
                        fields: ['id'],
                        displayContext: 'test_manager',
                      });
                      const updateRunDetails = payload?.items ?? [];
                      if (updateRunDetails.length !== 1) {
                        message.error(t('page.plan.testEntityList.updateCaseVersionTips'));
                        return;
                      }
                    } catch (err) {
                      console.error(err);
                      message.error(t('common.error'));
                      return;
                    }
                  }
                  // 更新执行用例
                  const _testRunIds: string[] = [record?.objectId || record?.id];
                  await testBatchUpateModalActionRef.current.open({
                    caseId: record?.itemId || record?.caseId, // 用例id： 如果是版本取itemId，如果是用例取 caseId
                    testRunIds: _testRunIds,
                    tableData: actionRef.current.dataSource,
                    workspaceKey: workspaceKey,
                  });
                };
                return (
                  <div className={cx('form')}>
                    {/* 更新执行状态 */}
                    <TableCellTestDetailFormReadOnly
                      values={record?.runDetail ?? {}}
                      extraElement={
                        config?.caseSnapshot?.enableCaseExeUpdate && (
                          <h6
                            style={{ fontSize: '14px', color: '#0c62ff', cursor: 'pointer' }}
                            onClick={() => handleUpdateExe()}
                          >
                            {t('page.plan.testEntityList.updateCaseVersion')}
                          </h6>
                        )
                      }
                    />
                  </div>
                );
              },
            }
          }
        />
      )}
      {activeType !== 'TestPlan' && (
        <TestRunModal
          actionRef={testRunModalActionRef}
          version={VERSION.V2}
          getNext={getNext}
          selectedTestPlanId={selectedTestPlan?.objectId}
        />
      )}
      {/* 更新执行用例 */}
      <TestBatchUpdateExeModal
        actionRef={testBatchUpateModalActionRef}
        refresh={() => {
          // 刷新依赖数据
          refreshTreeAndScopeTestCase?.();
          setTimeout(() => {
            actionRef.current.refresh();
          }, 400);
        }}
      />
    </div>
  );
};

export default TestEntityList;
