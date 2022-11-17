import React, { useCallback, useEffect, useRef, useState } from 'react';
import { notification, Spin } from 'antd';
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

const PlanPageLayout: React.FC<any> = () => {
  const { workspaceKey, selectedTestPlan, selectors, setSearchParams, setSelectedTestPlan } =
    usePageContext();
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

  const [activedType, setActivedType] = useState('TestPlan');
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
      activedType !== 'TestPlan' && setActivedType('TestPlan');
      showType !== 'showChild' && setShowType('showChild');
      setSelectedExecution(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestPlan]);

  useEffect(() => {
    if (query?.actionType && !activedType) {
      setActivedType(query?.actionType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.actionType]);

  // 获取测试计划范围
  const { data: scopedTestDetailIds, refreshAsync: scopedTestDetailRefresh } =
    useScopedTestDetailIds({
      workspaceKey,
      type: activedType === 'TestPlan' ? 'Plan' : 'Execution',
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
  }, [activedType, selectedExecution, selectedTestPlan]);

  // 处理 folder tree change
  const handleFolderSelect = ids => {
    setRequestScopedTestDetailIds(ids);
  };

  useEffect(() => {
    if (activedType === 'TestPlan') {
      selectedExecution && setSelectedExecution(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activedType]);

  const getSelectCaseIds = useCallback(async () => {
    if (!testEntitySelectorRef.current?.open) return;
    const data = await testEntitySelectorRef.current?.open({
      selectValue,
      treeType,
      modelProps: {
        title: '第 1 步：选择关联用例',
        footer: {
          ok: {
            name: '下一步',
          },
          cancel: {
            name: '取消',
          },
        },
      },
    });

    return data;
  }, [selectValue, treeType]);

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
            title: `第 2 步：新建测试执行任务（已选 ${caseIds.length} 条用例）`,
            footer: {
              cancel: {
                name: '上一步',
              },
            },
          },
        },
      });

      return res;
    },
    [createItemUseModal, selectedTestPlan?.objectId],
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
          message: '测试执行任务正在创建中',
          icon: <Spin spinning={true} />,
          duration: null,
        });

        // 创建完测试执行任务事项，更新测试执行任务关联测试计划
        await updateTestEntity([
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

        // 创建测试执行
        if (caseIds.length > 0) {
          await batchCreateTestRun({
            executionId: item.objectId,
            caseIds,
          });
        }

        notification.destroy();
        notification.success({
          message: `测试执行任务【${item.name}】新建成功`,
        });
        if (isCheckCreateNext) {
          await createTestExecution(isCheckCreateNext);
        }
        setRefreshExecution(true);
      } catch (err) {
        notification.destroy();
        notification.error({
          message: '测试执行任务新建失败',
        });
      }
    },
    [createExecution, getSelectCaseIds, setRefreshExecution],
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
                activedType={activedType}
                setActivedType={setActivedType}
                selectedExecution={selectedExecution}
                setSelectedExecution={setSelectedExecution}
                refreshExecution={refreshExecution}
                setRefreshExecution={setRefreshExecution}
                createTestExecution={createTestExecution}
                setLoading={setLoading}
              />
            </PageLayout.Header>
            {activedType === 'TestExecution' && !selectedExecution?.objectId && (
              <PageLayout.NoData>
                <Spin spinning={loading}>
                  <NoData createTestExecution={createTestExecution} />
                </Spin>
              </PageLayout.NoData>
            )}
            {(activedType === 'TestPlan' || selectedExecution?.objectId) && (
              <PageLayout.Left>
                <Left
                  actionRef={pageLeftRef}
                  showType={showType}
                  handleFolderSelect={handleFolderSelect}
                  scopedTestDetailIds={scopedTestDetailIds}
                />
              </PageLayout.Left>
            )}
            {(activedType === 'TestPlan' || selectedExecution?.objectId) && (
              <PageLayout.Right>
                <Spin spinning={loading}>
                  <Right
                    pageLeftRef={pageLeftRef}
                    activedType={activedType}
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
