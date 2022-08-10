/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import { Spin } from 'antd';
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

import cx from './index.less';

const PlanPageLayout: React.FC<any> = () => {
  const { workspaceKey, selectedTestPlan, setSearchParams, setSelectedTestPlan } = usePageContext();
  const [requestScopedTestDetailIds, setRequestScopedTestDetailIds] = React.useState<
    string[] | undefined
  >(undefined);
  useResizeContainerDOM(selectedTestPlan?.objectId);
  const detailSearchRef = useRef(null);
  const pageLeftRef = useRef(null);

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
      // eslint-disable-next-line no-console
      planData && setSelectedTestPlan(planData as any);
    }
  }, [planData, query?.planId]);

  useEffect(() => {
    if (selectedTestPlan?.objectId) {
      activedType !== 'TestPlan' && setActivedType('TestPlan');
      showType !== 'showChild' && setShowType('showChild');
      setSelectedExecution(undefined);
    }
  }, [selectedTestPlan]);

  useEffect(() => {
    if (query?.actionType && !activedType) {
      setActivedType(query?.actionType);
    }
  }, [query?.actionType]);

  // 获取测试计划范围
  const { data: scopedTestDetailIds, refresh: scopedTestDetailRefresh } = useScopedTestDetailIds({
    workspaceKey,
    type: activedType === 'TestPlan' ? 'Plan' : 'Execution',
    testPlanId: selectedTestPlan?.objectId,
    testExecutionId: selectedExecution?.objectId,
  });

  useEffect(() => {
    detailSearchRef.current?.reset();
    setSearchParams([{}, {}]);
    pageLeftRef.current?.reset();
  }, [activedType, selectedExecution, selectedTestPlan]);

  // 处理 folder tree change
  const handleFolderSelect = ids => {
    setRequestScopedTestDetailIds(ids);
  };

  useEffect(() => {
    if (activedType === 'TestPlan') {
      selectedExecution && setSelectedExecution(undefined);
    }
  }, [activedType]);

  return (
    <div className={cx('test-plan-page')}>
      {!selectedTestPlan?.objectId ? (
        <TestPlanList />
      ) : (
        <PageLayout>
          <PageLayout.Header>
            <Header
              activedType={activedType}
              setActivedType={setActivedType}
              selectedExecution={selectedExecution}
              setSelectedExecution={setSelectedExecution}
              refreshExecution={refreshExecution}
              setRefreshExecution={setRefreshExecution}
              setLoading={setLoading}
            />
          </PageLayout.Header>
          {activedType === 'TestExecution' && !selectedExecution?.objectId && (
            <PageLayout.NoData>
              <Spin spinning={loading}>
                <NoData setRefreshExecution={setRefreshExecution} />
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
              <Right
                pageLeftRef={pageLeftRef}
                activedType={activedType}
                selectedExecution={selectedExecution}
                showType={showType}
                setShowType={setShowType}
                scopedTestDetailRefresh={scopedTestDetailRefresh}
                refreshPlanData={refreshPlanData}
                requestScopedTestDetailIds={requestScopedTestDetailIds}
              />
            </PageLayout.Right>
          )}
          )
        </PageLayout>
      )}
    </div>
  );
};

export default PlanPageLayout;
