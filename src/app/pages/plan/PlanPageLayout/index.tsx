import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message, notification, Spin } from 'antd';
import TestPlanList from '@/components/business/TestPlanList';
import PageLayout from '@/components/common/PageLayout';
import { useLocation } from 'react-router-dom';
import useGetTestPlanById from '@/components/business/TestPlanList/hooks';
import { useScopedTestDetailIds, useResizeContainerDOM } from './hooks';
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

const PlanPageLayout: React.FC<any> = () => {
  const { workspaceKey, selectedTestPlan, selectors, setSearchParams, setSelectedTestPlan } =
    usePageContext();
  const { t } = useI18n();
  const [requestScopedTestDetailIds, setRequestScopedTestDetailIds] = React.useState<
    string[] | undefined
  >(undefined);
  useResizeContainerDOM(selectedTestPlan?.objectId);
  const detailSearchRef = useRef(null);
  const pageLeftRef = useRef(null);
  const { createItemUseModal } = useBaseAction();
  const testEntitySelectorRef = useRef<ModelActionType>();
  const [selectValue, setSelectValue] = useState<string[] | undefined>(undefined);
  const [treeType, setTreeType] = React.useState<string | undefined>('plan');

  const [activeType, setActiveType] = useState('TestPlan');
  const [selectedExecution, setSelectedExecution] = useState<Record<string, any> | undefined>(
    undefined,
  );

  const [refreshExecution, setRefreshExecution] = useState(false);
  const [showType, setShowType] = useState('showChild');
  const [loading, setLoading] = useState(false);

  const { query } = useLocation();
  const { data: planData, refresh: refreshPlanData } = useGetTestPlanById(
    selectedTestPlan?.objectId,
    workspaceKey,
  );

  useEffect(() => {
    if ((planData as any)?.objectId) {
      const oldPlanTestIds = selectedTestPlan?.refTestDetails?.map(item => item.objectId) ?? [];
      const newPlanTestIds = (planData as any)?.refTestDetails?.map(item => item.objectId) ?? [];

      if (oldPlanTestIds?.length !== newPlanTestIds.length) {
        setSelectedTestPlan(planData as any);
      }
    }

    if (query?.planId && planData && !selectedTestPlan) {
      planData && setSelectedTestPlan(planData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planData, query?.planId]);

  useEffect(() => {
    if (selectedTestPlan?.objectId) {
      activeType !== 'TestPlan' && setActiveType('TestPlan');
      showType !== 'showChild' && setShowType('showChild');
      setSelectedExecution(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestPlan]);

  useEffect(() => {
    if (query?.actionType && !activeType) {
      setActiveType(query?.actionType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.actionType]);

  // 获取测试计划范围
  const { data: scopedTestDetailIds, refreshAsync: scopedTestDetailRefresh } =
    useScopedTestDetailIds({
      workspaceKey,
      type: activeType === 'TestPlan' ? 'Plan' : 'Execution',
      testPlanId: selectedTestPlan?.objectId,
      testExecutionId: selectedExecution?.objectId,
      selectors,
    });

  useEffect(() => {
    if (selectedTestPlan?.objectId) {
      scopedTestDetailRefresh();
    }
  }, [selectedTestPlan?.objectId, scopedTestDetailRefresh]);

  useEffect(() => {
    detailSearchRef.current?.reset();
    setSearchParams([{}, {}]);
    pageLeftRef.current?.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, selectedExecution, selectedTestPlan]);

  // 处理 folder tree change
  const handleFolderSelect = ids => {
    setRequestScopedTestDetailIds(ids);
  };

  useEffect(() => {
    if (activeType === 'TestPlan') {
      selectedExecution && setSelectedExecution(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

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
            title: `${t('page.plan.planPageLayout.createExecutionModelTitle.0')} ${
              caseIds.length
            } ${t('page.plan.planPageLayout.createExecutionModelTitle.2')}`,
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
        notification.success({
          message: `${t('page.plan.planPageLayout.right.createTestExecutionSuccessMessage.0')}【${
            item.name
          }】${t('page.plan.planPageLayout.right.createTestExecutionSuccessMessage.1')}`,
        });
        if (isCheckCreateNext) {
          await createTestExecution(isCheckCreateNext);
        }
        setRefreshExecution(true);
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
  useListener('updateRepoTree', () => {
    scopedTestDetailRefresh();
  });

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
                  handleFolderSelect={handleFolderSelect}
                  scopedTestDetailIds={scopedTestDetailIds}
                />
              </PageLayout.Left>
            )}
            {(activeType === 'TestPlan' || selectedExecution?.objectId) && (
              <PageLayout.Right>
                <Spin spinning={loading}>
                  <Right
                    pageLeftRef={pageLeftRef}
                    activeType={activeType}
                    selectedExecution={selectedExecution}
                    showType={showType}
                    setShowType={setShowType}
                    scopedTestDetailRefresh={scopedTestDetailRefresh}
                    refreshPlanData={refreshPlanData}
                    requestScopedTestDetailIds={requestScopedTestDetailIds}
                    scopedTestDetailIds={scopedTestDetailIds}
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
            planId={selectedTestPlan?.objectId}
          />
        </>
      )}
    </div>
  );
};

export default PlanPageLayout;
