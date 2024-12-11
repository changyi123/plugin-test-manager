import { useListener } from '@projectproxima/proxima-sdk-js';
import { useUpdateEffect } from 'ahooks';
import { message, notification, Spin } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import PageLayout from '@/components/common/PageLayout';
import BasicPageLayout from '@/components/common/PageLayout/Basic';
import { batchCreateTestRun, getLinkedTestEntityByQuery, updateTestEntity } from '@/lib/api/item';
import { PROXIMA_EVENT_KEY, TestLinkType, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getExecutionDefaultConfig } from '@/lib/utils/execution';
import { generateSortIndex } from '@/lib/utils/helper';
import TestPlanList from '@/pages/plan/TestPlanList';

import { usePageContext } from '../hook';
import Header from './Header';
import { useGetExecutionLinkCaseRunIds, useGetPlanLinkCaseIds } from './hooks';
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
  const [selectNode, setSelectNode] = React.useState<Record<string, any>>(null);

  const [activeType, setActiveType] = useState<'TestPlan' | 'TestExecution'>('TestExecution');
  const [selectedExecution, setSelectedExecution] = useState<Record<string, any> | undefined>(
    undefined,
  );

  const [showType, setShowType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [treeParams, setTreeParams] = useState<any>(null);

  const { query } = useLocation();

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

  useUpdateEffect(() => {
    if (!workspaceKey || !selectedTestPlan?.objectId) return;
    if (activeType === 'TestExecution') {
      if (runLinkSnapshotIds?.length && !selectedExecution?.objectId) return;
      const treeParams = {
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          id: runLinkCaseIds,
        },
        selector: '',
      };

      if (runLinkSnapshotIds?.length) {
        treeParams.query.id = runLinkSnapshotIds;
        treeParams.selector = `'baseLineSources' in ['${selectedExecution.objectId}']`;
      }
      setTreeParams(treeParams);
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
  }, [
    activeType,
    runLinkCaseIds,
    selectedTestPlan?.objectId,
    workspaceKey,
    selectedExecution,
    runLinkSnapshotIds,
  ]);

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
            case: caseIds.map(i => ({
              caseId: i,
            })),
          });
        }

        notification.destroy();
        if (isCheckCreateNext) {
          setTimeout(() => {
            createTestExecution(isCheckCreateNext);
          }, 500);
        }
        executionListRef?.current?.refresh();
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
    [createExecution, getSelectCaseIds, executionListRef, t],
  );

  const addTestExecutionToPlan = React.useCallback(
    async ids => {
      // 测试计划关联测试执行后需将测试执行任务中的测试执行对应的测试用例关联到测试计划中
      const res = await updateTestEntity(
        ids.map(objectId => ({
          objectId,
          linkType: TestLinkType.ExecutionLinkPlan,
          type: TestType.Execution,
          linkItems: { action: 'add', value: [selectedTestPlan?.objectId] },
          sortIndex: generateSortIndex(),
        })),
      );
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }

      const { list: runs } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: ids,
        destinationType: TestType.Run,
        select: ['id', 'referenceCase'],
      });

      const runCaseIds = runs?.map(run => run.referenceCase) ?? [];
      const caseIds = runCaseIds.filter(id => !planLinkCaseIds?.includes(id));

      if (caseIds.length) {
        const res = await updateTestEntity(
          caseIds.map(item => ({
            objectId: item,
            linkType: TestLinkType.CaseLinkPlan,
            linkItems: {
              action: 'add',
              value: [selectedTestPlan.objectId],
            },
          })),
        );
        if (res?.status === 'error') {
          message.error(res.data);
          return;
        }
      }
      message.success(
        `${ids.length} ${t('modules.panel.testPlan.testExecutionPanel.addRunToPlanSuccess')}`,
      );
    },
    [workspaceKey, selectedTestPlan?.objectId, planLinkCaseIds, t],
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
    executionListRef?.current.refresh();
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
        executionListRef?.current?.refresh();
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
                setSelectedExecution={setSelectedExecution}
                executionListRef={executionListRef}
                createTestExecution={createTestExecution}
                setLoading={setLoading}
                planLinkCaseIds={planLinkCaseIds}
                addExistedTestExecution={addExistedTestExecution}
                selectorModalRef={selectorModalRef}
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
            {(activeType === 'TestPlan' || selectedExecution?.objectId) && (
              <PageLayout.Left>
                <Left
                  actionRef={pageLeftRef}
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
                    selectNode={selectNode}
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
