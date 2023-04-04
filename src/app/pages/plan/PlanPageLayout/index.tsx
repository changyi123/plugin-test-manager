import React, { useCallback, useRef, useState } from 'react';
import { message, notification, Spin } from 'antd';
import TestPlanList from '@/pages/plan/TestPlanList';
import PageLayout from '@/components/common/PageLayout';
import { useLocation } from 'react-router-dom';
// import useGetTestPlanById from '@/pages/plan/TestPlanList/hooks';
import {
  useResizeContainerDOM,
  useGetPlanLinkCaseIds,
  useGetExecutionLinkCaseRunIds,
} from './hooks';
import { usePageContext } from '../hook';
import Header from './Header';
import Right from './Right';
import Left from './Left';
import NoData from './NoData';
import { useListener } from '@projectproxima/proxima-sdk-js';
import cx from './index.less';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import { PROXIMA_EVENT_KEY, TestLinkType, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import { generateSortIndex } from '@/lib/utils/helper';
import { batchCreateTestRun, updateTestEntity } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import { QueryLinkedTestEntityPayload } from 'common/types/api';
import { useUpdateEffect } from 'ahooks';

const PlanPageLayout: React.FC<any> = () => {
  const {
    workspaceKey,
    selectedTestPlan,
    runLinkCaseIds,
    setSearchParams,
    // setSelectedTestPlan,
    setPlanLinkCaseIds,
    setExecutionLinkRunIds,
    setRunLinkCaseIds,
  } = usePageContext();
  const { t } = useI18n();
  useResizeContainerDOM(selectedTestPlan?.objectId);
  const detailSearchRef = useRef(null);
  const pageLeftRef = useRef(null);
  const { createItemUseModal } = useBaseAction();
  const testEntitySelectorRef = useRef<ModelActionType>();
  const [selectValue, setSelectValue] = useState<string[] | undefined>(undefined);
  const [treeType, setTreeType] = React.useState<string | undefined>('plan');
  const [selectNode, setSelectNode] = React.useState<Record<string, any>>(null);

  const [activeType, setActiveType] = useState('TestPlan');
  const [selectedExecution, setSelectedExecution] = useState<Record<string, any> | undefined>(
    undefined,
  );

  const [refreshExecution, setRefreshExecution] = useState(false);
  const [showType, setShowType] = useState('showChild');
  const [loading, setLoading] = useState(false);
  const [treeParams, setTreeParams] = useState<QueryLinkedTestEntityPayload>(null);

  const { query } = useLocation();
  // const { data: planData, refresh: refreshPlanData } = useGetTestPlanById(
  //   selectedTestPlan?.objectId,
  //   workspaceKey,
  // );

  // useUpdateEffect(() => {
  //   if ((planData as any)?.objectId) {
  //     const oldPlanTestIds = selectedTestPlan?.refTestDetails?.map(item => item.objectId) ?? [];
  //     const newPlanTestIds = (planData as any)?.refTestDetails?.map(item => item.objectId) ?? [];

  //     if (oldPlanTestIds?.length !== newPlanTestIds.length) {
  //       setSelectedTestPlan(planData as any);
  //     }
  //   }

  //   if (query?.planId && planData && !selectedTestPlan) {
  //     planData && setSelectedTestPlan(planData);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [planData, query?.planId]);

  useUpdateEffect(() => {
    if (selectedTestPlan?.objectId) {
      activeType !== 'TestPlan' && setActiveType('TestPlan');
      showType !== 'showChild' && setShowType('showChild');
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
  const { data: planLinkCaseIds, refresh: planLinkCaseIdRefresh } = useGetPlanLinkCaseIds({
    workspaceKey,
    type: 'TestPlan',
    testPlanId: selectedTestPlan?.objectId,
  });

  // 获取测试任务下测试执行和测试用例 id
  const { data: scopeTestRunIds, refresh: scopeTestRunIdsRefresh } = useGetExecutionLinkCaseRunIds({
    workspaceKey,
    type: 'TestExecution',
    testExecutionId: selectedExecution?.objectId,
    planLinkCaseIds,
  });

  useUpdateEffect(() => {
    setPlanLinkCaseIds(planLinkCaseIds);
  }, [planLinkCaseIds]);

  useUpdateEffect(() => {
    setRunLinkCaseIds(scopeTestRunIds?.runLinkCaseIds);
    setExecutionLinkRunIds(scopeTestRunIds?.executionLinkRunIds);
  }, [scopeTestRunIds]);

  useUpdateEffect(() => {
    if (!workspaceKey || !selectedTestPlan?.objectId) return;
    if (activeType === 'TestExecution') {
      setTreeParams({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          id: runLinkCaseIds,
        },
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [selectedTestPlan?.objectId as string],
        destinationType: TestType.Case,
      });
    } else {
      setTreeParams({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
        },
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [selectedTestPlan?.objectId as string],
        destinationType: TestType.Case,
      });
    }
  }, [activeType, runLinkCaseIds, selectedTestPlan?.objectId, workspaceKey]);

  useUpdateEffect(() => {
    if (!selectedTestPlan?.objectId) return;
    detailSearchRef.current?.reset();
    setSearchParams([{}, {}]);
    pageLeftRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, selectedExecution, selectedTestPlan]);

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
      });

      return res;
    },
    [createItemUseModal, selectedTestPlan?.objectId, t],
  );

  const refreshTreeAndScopeTestCase = useCallback(() => {
    pageLeftRef.current.refresh?.();
    planLinkCaseIdRefresh();
    scopeTestRunIdsRefresh();
  }, [planLinkCaseIdRefresh, scopeTestRunIdsRefresh, pageLeftRef]);

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

      // TODO 创建测试执行，创建测试执行任务和执行关系，创建执行和用例关系
      try {
        notification.open({
          message: t('page.plan.planPageLayout.testExecutionCreateLoading'),
          icon: <Spin spinning={true} />,
          duration: null,
        });

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
          await batchCreateTestRun({
            executionId: item.objectId,
            caseIds,
          });
        }

        notification.destroy();
        if (isCheckCreateNext) {
          await createTestExecution(isCheckCreateNext);
        }
        setRefreshExecution(true);
        notification.success({
          message: `${t('page.plan.planPageLayout.right.createTestExecutionSuccessMessage.0')}【${
            item.name
          }】${t('page.plan.planPageLayout.right.createTestExecutionSuccessMessage.1')}`,
        });
      } catch (err) {
        notification.destroy();
        notification.error({
          message: t('page.plan.planPageLayout.right.createTestExecutionFailMessage'),
        });
      }
    },
    [createExecution, getSelectCaseIds, setRefreshExecution, t],
  );

  const cancelCallback = useCallback(
    async params => {
      if (params?.type === 'prev') {
        await createTestExecution();
      }
    },
    [createTestExecution],
  );

  const refresh = useCallback(
    (props = {}) => {
      setSelectValue([]);
      setTreeType('plan');
      if (!props?.itemIdList?.length) {
        setRefreshExecution(true);
      }
    },
    [setRefreshExecution],
  );

  useListener('CreateItemModalPrev', cancelCallback);
  useListener(PROXIMA_EVENT_KEY.itemBatchCreateSuccess, props => {
    refresh(props);
  });
  // useListener('updateRepoTree', () => {
  //   scopedTestCaseRefresh();
  // });

  return (
    <div className={cx('test-plan-page')}>
      {!selectedTestPlan?.objectId ? (
        <TestPlanList />
      ) : (
        <>
          <PageLayout>
            <PageLayout.Header>
              <Header
                activeType={activeType}
                setActiveType={setActiveType}
                selectedExecution={selectedExecution}
                setSelectedExecution={setSelectedExecution}
                refreshExecution={refreshExecution}
                setRefreshExecution={setRefreshExecution}
                createTestExecution={createTestExecution}
                setLoading={setLoading}
              />
            </PageLayout.Header>
            {activeType === 'TestExecution' && !selectedExecution?.objectId && (
              <PageLayout.NoData>
                <Spin spinning={loading}>
                  <NoData createTestExecution={createTestExecution} />
                </Spin>
              </PageLayout.NoData>
            )}
            {(activeType === 'TestPlan' || selectedExecution?.objectId) && (
              <PageLayout.Left>
                <Left
                  actionRef={pageLeftRef}
                  showType={showType}
                  treeParams={treeParams}
                  activeType={activeType}
                  onFolderSelect={node => setSelectNode(node)}
                />
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
                    // refreshPlanData={refreshPlanData}
                    selectNode={selectNode}
                  />
                </Spin>
              </PageLayout.Right>
            )}
          </PageLayout>
          <TestEntitySelectorModal
            title="选择规划的测试用例"
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
