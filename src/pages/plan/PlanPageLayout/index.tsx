/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Spin, notification } from 'antd';
import TestPlanList from '@/components/business/TestPlanList';
import PageLayout from '@/components/common/PageLayout';
import { ArrowLeftOutlined } from '@ant-design/icons';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import { StatusProgress } from '@/components/business/Status';
import { createTestExecutionAndRelations } from '@/lib/api/runs';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestRelationType, TestType } from '@/lib/constants';
import { actionConfirm } from '@/lib/utils/helper';
import { useRequest } from 'ahooks';
import {
  deleteTestEntities,
  getTestEntitiesByQuery,
  getTestEntitiesByRelationWithOrder,
} from '@/lib/api/common';
import { deleteItems } from '@/lib/api/proxima';
import { usePageContext } from '../hook';
import Main from '../Main';
import ExcetionList from './ExcetionList';
import { useResizeContainerDOM } from './hooks';

import cx from './index.less';

const PlanPageLayout: React.FC<any> = () => {
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan } = usePageContext();
  const { createItemUseModal } = useBaseAction();
  useResizeContainerDOM(selectedTestPlan?.objectId);

  const [activedType, setActivedType] = useState('allTest');
  const [selectedExcetion, setSelectedExcetion] = useState<Record<string, any> | undefined>(
    undefined,
  );
  const [refreshExcetion, setRefreshExcetion] = useState(false);

  // 创建测试执行任务
  const createTestExecution = async () => {
    const { testEntity: testExecutionEntity } = await createItemUseModal({
      type: TestType.TestExecution,
    });

    try {
      notification.open({
        message: '测试执行任务正在创建中',
        icon: <Spin spinning={true} />,
        duration: null,
      });
      const testExecutionData = testExecutionEntity.toJSON();

      await createTestExecutionAndRelations({
        workspaceKey: workspaceKey,
        testPlan: selectedTestPlan?.objectId,
        testExecution: testExecutionEntity,
      });

      notification.destroy();
      notification.success({
        message: `测试执行任务【${testExecutionData?.reference?.name}】新建成功`,
      });
      setRefreshExcetion(true);
    } catch (err) {
      notification.error({
        message: '测试执行任务新建失败',
      });
      notification.destroy();
    }
  };

  // 获取当前计划或者当前测试任务的全部测试用例 ID
  const { data: allTestDetailIds, refresh: detailRefresh } = useRequest(
    async () => {
      if (!selectedTestPlan?.objectId) return [];

      const relationType =
        activedType === 'allTest'
          ? TestRelationType.PlanRelDetail
          : TestRelationType.ExecutionRelRun;

      const from =
        activedType === 'allTest' ? [selectedTestPlan?.objectId] : [selectedExcetion?.objectId];

      const relationData = await getTestEntitiesByRelationWithOrder(
        relationType,
        {
          from: from,
        },
        {
          workspaceKey,
          select: ['objectId'],
          include: ['reference'],
          queryParams: { limit: 9999 },
          descendingBy: 'createdAt',
        },
      );

      return relationData?.list.map(d => d.objectId);
    },
    {
      refreshDeps: [selectedTestPlan, activedType, selectedExcetion],
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  const tableDataGetter = useCallback(
    async queryParams => {
      const testType = activedType === 'allTest' ? TestType.TestDetail : TestType.TestRun;

      const include =
        activedType === 'allTest'
          ? ['repository', 'reference']
          : [
              'runReferenceDetail.reference',
              'runReferenceDetail.repository',
              'executor',
              'designee',
            ];

      const select =
        activedType === 'allTest'
          ? ['type', 'sortIndex', 'reference', 'repository', 'workspaceKey', 'createdAt']
          : [
              'status',
              'sortIndex',
              'runReferenceDetail.reference',
              'runReferenceDetail.repository',
              'executor',
              'designee',
            ];
      const descendingBy = activedType === 'allTest' ? ['sortIndex', 'createdAt'] : ['createdAt'];

      const { results: testDetails, count } = await getTestEntitiesByQuery(
        {
          in: allTestDetailIds ?? [],
          type: testType,
          nameLike: '',
          workspaceKey,
        },
        {
          ...queryParams,
          descendingBy,
          select,
          include,
        },
      );

      return {
        list: testDetails,
        total: count,
      };
    },
    [workspaceKey, allTestDetailIds],
  );

  useEffect(() => {
    if (activedType === 'allTest') {
      selectedExcetion && setSelectedExcetion(undefined);
    }
  }, [activedType]);

  return (
    <div className={cx('test-plan-page')}>
      {!selectedTestPlan?.objectId ? (
        <TestPlanList />
      ) : (
        <PageLayout>
          <PageLayout.Header>
            <div className={cx('page-header')}>
              <div className={cx('header-left')}>
                <ArrowLeftOutlined
                  className={cx('icon')}
                  onClick={() => setSelectedTestPlan(undefined)}
                />
                <TestPlanSelector />
                <div className={cx('test-tabs')}>
                  <div
                    className={cx('tab-title', activedType === 'allTest' ? 'actived' : '')}
                    onClick={() => setActivedType('allTest')}
                  >
                    全部用例
                  </div>
                  <div
                    className={cx('tab-title', activedType === 'excetion' ? 'actived' : '')}
                    onClick={() => setActivedType('excetion')}
                  >
                    测试执行任务
                  </div>
                </div>
              </div>
              <div className={cx('header-right')}>
                {activedType === 'excetion' && (
                  <div className={cx('complete-rate-box')}>
                    <span className={cx('rate')}>完成率 30%</span>
                    <div className={cx('progress')}>
                      <StatusProgress hasSummary statuses={[]} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={cx('action-box')}>
              <ExcetionList
                planId={selectedTestPlan?.objectId}
                activedType={activedType}
                workspaceKey={workspaceKey}
                selectedExcetion={selectedExcetion}
                setSelectedExcetion={setSelectedExcetion}
                refreshExcetion={refreshExcetion}
                setRefreshExcetion={setRefreshExcetion}
              />
              <div className={cx('box-right')}>
                {activedType === 'excetion' && (
                  <Button
                    disabled={!selectedExcetion?.objectId}
                    onClick={() =>
                      actionConfirm('该操作会将该测试执行任务删除，是否继续操作？', async () => {
                        await Promise.all([
                          deleteTestEntities([selectedExcetion?.objectId]),
                          deleteItems([selectedExcetion.reference.objectId]),
                        ]);
                        setSelectedExcetion(undefined);
                        setRefreshExcetion(true);
                      })
                    }
                  >
                    删除当前任务
                  </Button>
                )}
                <Button type="primary" onClick={createTestExecution}>
                  新建测试执行任务
                </Button>
              </div>
            </div>
          </PageLayout.Header>
          <PageLayout.Left>{/* <PlanList /> */}</PageLayout.Left>
          <PageLayout.Right>
            <Main />
          </PageLayout.Right>
        </PageLayout>
      )}
    </div>
  );
};

export default PlanPageLayout;
