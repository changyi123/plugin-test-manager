import { useListener } from '@projectproxima/proxima-sdk-js';
import { useUpdateEffect } from 'ahooks';
import { message, notification, Spin } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  addExecutionToPlanWithProcess,
  createTestRunWithProcess,
} from '@/components/business/BatchResult/hooks';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import PageLayout from '@/components/common/PageLayout';
import BasicPageLayout from '@/components/common/PageLayout/Basic';
import { updateTestEntity } from '@/lib/api/item';
import { PROXIMA_EVENT_KEY, TestLinkType, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getExecutionDefaultConfig } from '@/lib/utils/execution';
import { generateSortIndex } from '@/lib/utils/helper';
import TestPlanList from '@/pages/plan/TestPlanList';

import { usePageContext } from '../hook';
import Header from './Header';
import ExecutionList from './ExecutionListNew';
import {
  useGetExecutionLinkCaseRunIds,
  useGetPlanLinkCaseIds,
  useResizeContainerDOM,
  useExecutionList,
  useTreeParams
} from './hooks';
import cx from './index.less';
import Left from './Left';
import NoData from './NoData';
import Right from './Right';

type ExecutionListRef = {
  refresh?: () => void;
};

const PlanPageLayout: React.FC<any> = () => {
  const {
    workspaceKey,
    selectedTestPlan,
    runLinkCaseIds,
    runLinkSnapshotIds,
    setRunLinkSnapshotIds,
    setSearchParams,
    // setSelectedTestPlan,
    setPlanLinkCaseIds,
    setExecutionLinkRunIds,
    setRunLinkCaseIds,
  } = usePageContext();
  const { t } = useI18n();
  const executionListRef = React.useRef<ExecutionListRef>();
  const selectorModalRef = React.useRef<ModelActionType>();
  const detailSearchRef = useRef(null);
  const pageLeftRef = useRef(null);
  const { createItemUseModal } = useBaseAction();
  const testEntitySelectorRef = useRef<ModelActionType>();
  const [selectValue, setSelectValue] = useState<string[] | undefined>(undefined);
  const [treeType, setTreeType] = React.useState<string | undefined>('repository');
  const [selectNode, setSelectNode] = React.useState<Record<string, any>>({key: 'root'});

  const [activeType, setActiveType] = useState<'TestPlan' | 'TestExecution'>('TestExecution');
  const [selectedExecution, setSelectedExecution] = useState<Record<string, any> | undefined>(
    undefined,
  );

  const [showType, setShowType] = useState('all');
  const [loading, setLoading] = useState(false);

  const [executionKeys, setExecutionKeys] = React.useState<string[]>([]);

  const { query } = useLocation();
  const {
      refresh: refreshExecutionList,
      loading: loadingExecutionList,
      executionList,
      activeId,
      setActiveId,
      setSelectors,
    } = useExecutionList({ activeType, workspaceKey, planId:selectedTestPlan?.objectId, setExecutionKeys, selectedExecution, setSelectedExecution })

  useUpdateEffect(() => {
    if (selectedTestPlan?.objectId) {
      activeType !== 'TestExecution' && setActiveType('TestExecution');
      showType !== 'all' && setShowType('all');
      setSelectedExecution(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestPlan]);

  useUpdateEffect(() => {
    if (!selectedTestPlan?.objectId) return;
    if (query?.actionType && !activeType) {
      setActiveType(query?.actionType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.actionType]);

  // 获取测试计划关联的全部测试用例 id
  const { data: planLinkCaseIds, refreshAsync: planLinkCaseIdRefresh } = useGetPlanLinkCaseIds({
    workspaceKey,
    type: 'TestPlan',
    testPlanId: activeType === 'TestPlan' ? selectedTestPlan?.objectId : null,
  });

  // 获取测试任务下测试执行 id
  const { data: scopeTestRunIds, refreshAsync: scopeTestRunIdsRefresh } =
    useGetExecutionLinkCaseRunIds({
      workspaceKey,
      type: 'TestExecution',
      testExecutionId: activeType === 'TestExecution' ? selectedExecution?.objectId : null,
    });

  useUpdateEffect(() => {
    setPlanLinkCaseIds(planLinkCaseIds);
  }, [planLinkCaseIds]);

  useUpdateEffect(() => {
    setRunLinkCaseIds(scopeTestRunIds?.runLinkCaseIds);
    setExecutionLinkRunIds(scopeTestRunIds?.executionLinkRunIds);
    setRunLinkSnapshotIds(scopeTestRunIds?.runLinkSnapshotIds);
  }, [scopeTestRunIds]);

  const treeParams = useTreeParams({
    workspaceKey,
    selectedExecution,
    selectedTestPlan,
    activeType,
    runLinkCaseIds,
    runLinkSnapshotIds,
    isPlanList: true,
  });

  useUpdateEffect(() => {
    if (!selectedTestPlan?.objectId) return;
    detailSearchRef.current?.reset();
    setSearchParams([{}, {}]);
    pageLeftRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, selectedExecution?.objectId, selectedTestPlan]);

  useUpdateEffect(() => {
    if (activeType === 'TestPlan') {
      selectedExecution && setSelectedExecution(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, pageLeftRef]);

  const getSelectCaseIds = useCallback(async () => {
    if (!testEntitySelectorRef.current?.open) return;
    const data = await testEntitySelectorRef.current?.open({
      selectValue,
      treeType,
      modelProps: {
        title: t('page.plan.planPageLayout.selectCaseModelTitle'),
        footer: {
          ok: {
            name: t('common.nextStep'),
          },
          cancel: {
            name: t('common.cancel'),
          },
        },
      },
    });

    return data;
  }, [selectValue, treeType, t]);

  const createExecution = useCallback(
    async (caseIds = [], createNext = false) => {
      const config = await getExecutionDefaultConfig(selectedTestPlan);
      const res = await createItemUseModal({
        type: TestType.Execution,
        extraData: {
          planId: selectedTestPlan?.objectId,
          isCustomCreateItem: true,
          isCheckCreateNext: createNext,
          isShowPrevButton: true,
          modalProps: {
            title: t('page.plan.planPageLayout.createExecutionModelTitle', {
              count: caseIds.length,
            }),
            footer: {
              cancel: {
                name: t('common.prevStep'),
              },
            },
          },
        },
        ...config,
      });

      return res;
    },
    [createItemUseModal, selectedTestPlan, t],
  );

  const refreshTreeAndScopeTestCase = useCallback(async () => {
    const refreshFn = activeType === 'TestPlan' ? planLinkCaseIdRefresh : scopeTestRunIdsRefresh;
    await refreshFn();
    pageLeftRef.current.refresh?.();
  }, [activeType, planLinkCaseIdRefresh, scopeTestRunIdsRefresh]);

  // 创建测试执行任务
  const createTestExecution = useCallback(
    async (createNext?: boolean) => {
      const data = await getSelectCaseIds();
      if (!data) return;
      const { selectedData: caseIds, treeType } = data;
      setSelectValue(caseIds);
      setTreeType(treeType);
      const { item, extraData } = await createExecution(caseIds, createNext);
      const isCheckCreateNext: boolean = (extraData as any)?.isCheckCreateNext;

      const handleSuccess = () => {
        if (isCheckCreateNext) {
          setTimeout(() => {
            createTestExecution(isCheckCreateNext);
          }, 500);
        }
        // executionListRef?.current?.refresh();
        refreshExecutionList && refreshExecutionList()
        notification.success({
          message: `${t('page.plan.planPageLayout.right.createTestExecutionSuccessMessage.0')}【${
            item.name
          }】${t('page.plan.planPageLayout.right.createTestExecutionSuccessMessage.1')}`,
        });
      };

      const handleFail = () =>
        notification.error({
          message: t('page.plan.planPageLayout.right.createTestExecutionFailMessage'),
        });

      // TODO 创建测试执行，创建测试执行任务和执行关系，创建执行和用例关系
      try {
        // 创建完测试执行任务事项，更新测试执行任务关联测试计划
        const res = await updateTestEntity([
          {
            objectId: item.objectId,
            type: TestType.Execution,
            linkType: TestLinkType.ExecutionLinkPlan,
            linkItems: {
              action: 'add',
              value: [extraData?.planId],
            },
            sortIndex: generateSortIndex(),
          },
        ]);
        if (res?.status === 'error') {
          message.error(res.data);
          return;
        }

        // 创建测试执行
        if (caseIds.length > 0) {
          await createTestRunWithProcess({
            execution: item,
            caseIds: caseIds,
            workspace: item?.workspace as any,
            planId: extraData?.planId,
            handleSuccess,
            handleFail,
          });
        }
      } catch (err) {
        handleFail;
      }
    },
    [createExecution, getSelectCaseIds, executionListRef, t],
  );

  const addTestExecutionToPlan = React.useCallback(
    async ids => {
      // 测试计划关联测试执行后需将测试执行任务中的测试执行对应的测试用例关联到测试计划中
      // @TODO update V2 add execution to plan
      await addExecutionToPlanWithProcess({
        executionIds: ids,
        planId: selectedTestPlan?.objectId,
        handleSuccess: () => {
          message.success(
            `${ids.length} ${t('modules.panel.testPlan.testExecutionPanel.addRunToPlanSuccess')}`,
          );
        },
        handleFail: error => {
          message.error(error.message);
        },
      });
    },
    [selectedTestPlan?.objectId, t],
  );

  // 关联测试执行任务
  const addExistedTestExecution = React.useCallback(async () => {
    const ids = await selectorModalRef.current.open({
      testType: TestType.Execution,
    });

    if (!ids?.length) {
      return notification.warning({
        message: t('modules.panel.testPlan.testExecutionPanel.notSelectMessage'),
      });
    }
    await addTestExecutionToPlan(ids);
    // executionListRef?.current.refresh();
    refreshExecutionList && refreshExecutionList()
  }, [addTestExecutionToPlan, executionListRef, t]);

  const cancelCallback = useCallback(
    async params => {
      if (params?.type === 'prev') {
        await createTestExecution();
      }
    },
    [createTestExecution],
  );

  const refresh = useCallback(
    (props = {} as any) => {
      setSelectValue([]);
      setTreeType('repository');
      if (!props?.itemIdList?.length) {
        // executionListRef?.current?.refresh();
        refreshExecutionList && refreshExecutionList()
      }
    },
    [executionListRef],
  );

  useListener('CreateItemModalPrev', cancelCallback);
  useListener(PROXIMA_EVENT_KEY.itemBatchCreateSuccess, props => {
    refresh(props);
  });
  
  return (
    <div className={cx('test-plan-page')}>
      {!selectedTestPlan?.objectId ? (
        <BasicPageLayout id={selectedExecution?.objectId}>
          <TestPlanList />
        </BasicPageLayout>
      ) : (
        <>
          <PageLayout>
            <PageLayout.Header>
              <Header
                activeType={activeType}
                setActiveType={setActiveType}
                selectedExecution={selectedExecution}
                // setSelectedExecution={setSelectedExecution}
                // executionListRef={executionListRef}
                createTestExecution={createTestExecution}
                // setLoading={setLoading}
                planLinkCaseIds={planLinkCaseIds}
                addExistedTestExecution={addExistedTestExecution}
                selectorModalRef={selectorModalRef}
                executionKeys={executionKeys}
                // setExecutionKeys={setExecutionKeys}
              />
            </PageLayout.Header>
            {activeType === 'TestExecution' && !selectedExecution?.objectId && (
              <PageLayout.NoData>
                <Spin spinning={loading}>
                  <NoData
                    createTestExecution={createTestExecution}
                    addExistedTestExecution={addExistedTestExecution}
                    selectorModalRef={selectorModalRef}
                  />
                </Spin>
              </PageLayout.NoData>
            )}
            {selectedExecution?.objectId && (
              <PageLayout.Left>
                <>
                  {['TestPlan'].includes(activeType) && (
                    <Left
                      actionRef={pageLeftRef}
                      treeParams={treeParams}
                      activeType={activeType}
                      onFolderSelect={node => setSelectNode(node)}
                    />
                  )}
                  {['TestExecution'].includes(activeType) && (
                    <ExecutionList
                      actionRef={executionListRef}
                      activeType={activeType}
                      setSelectedExecution={setSelectedExecution}
                      setLoading={setLoading}
                    
                      refresh={refreshExecutionList}
                      loading={loadingExecutionList}
                      executionList={executionList}
                      activeId={activeId}
                      setActiveId={setActiveId}
                      setSelectors={setSelectors}
                    />
                  )}
                </>
              </PageLayout.Left>
            )}
            {(activeType === 'TestPlan' || selectedExecution?.objectId) && (
              <PageLayout.Right>
                <Spin spinning={loading}>
                  <Right
                    activeType={activeType}
                    selectedExecution={selectedExecution}
                    showType={showType}
                    setShowType={setShowType}
                    refreshTreeAndScopeTestCase={refreshTreeAndScopeTestCase}
                    selectNode={selectNode}
                    treeParams={treeParams}
                    onFolderSelect={node => setSelectNode(node)}
                  />
                </Spin>
              </PageLayout.Right>
            )}
          </PageLayout>
          <TestEntitySelectorModal
            title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
            showDefaultRange
            testType={TestType.Case}
            actionRef={testEntitySelectorRef}
            onCancel={() => {
              refresh();
            }}
            afterClose={() => {
              refresh();
            }}
            planId={selectedTestPlan?.objectId}
          />
        </>
      )}
    </div>
  );
};

export default PlanPageLayout;
