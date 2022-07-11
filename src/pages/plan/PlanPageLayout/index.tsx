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
import { TestType } from '@/lib/constants';
import { actionConfirm } from '@/lib/utils/helper';
import { useScopedTestDetailIds } from './hooks';
import { deleteTestEntities, getTestEntitiesByQuery } from '@/lib/api/common';
import { deleteItems } from '@/lib/api/proxima';
import { usePageContext } from '../hook';
import Main from '../Main';
import ExecutionList from './ExecutionList';
import { useResizeContainerDOM } from './hooks';
import RepositoryFolderTree from '@/components/business/RepositoryFolderTree';

import cx from './index.less';

const PlanPageLayout: React.FC<any> = () => {
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan } = usePageContext();

  // 用于数据请求的测试用例 ids
  const [requestScopedTestDetailIds, setRequestScopedTestDetailIds] = React.useState([]);
  const { createItemUseModal } = useBaseAction();
  useResizeContainerDOM(selectedTestPlan?.objectId);

  const [activedType, setActivedType] = useState('allTest');
  const [selectedExecution, setSelectedExecution] = useState<Record<string, any> | undefined>(
    undefined,
  );
  const [refreshExecution, setRefreshExecution] = useState(false);

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
      setRefreshExecution(true);
    } catch (err) {
      notification.error({
        message: '测试执行任务新建失败',
      });
      notification.destroy();
    }
  };

  // 获取测试计划范围
  const { data: scopedTestDetailIds } = useScopedTestDetailIds({
    workspaceKey,
    type: activedType === 'allTest' ? 'Plan' : 'Execution',
    testPlanId: selectedTestPlan?.objectId,
    testExecutionId: selectedExecution?.objectId,
  });

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
          in: requestScopedTestDetailIds ?? [],
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
    [workspaceKey, scopedTestDetailIds],
  );

  useEffect(() => {
    if (activedType === 'allTest') {
      selectedExecution && setSelectedExecution(undefined);
    }
  }, [activedType]);

  // 处理 folder tree change
  const handleFolderSelect = ids => {
    setRequestScopedTestDetailIds(ids);
  };

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
                    className={cx('tab-title', activedType === 'execution' ? 'actived' : '')}
                    onClick={() => setActivedType('execution')}
                  >
                    测试执行任务
                  </div>
                </div>
              </div>
              <div className={cx('header-right')}>
                {activedType === 'execution' && (
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
              <ExecutionList
                planId={selectedTestPlan?.objectId}
                activedType={activedType}
                workspaceKey={workspaceKey}
                selectedExecution={selectedExecution}
                setSelectedExecution={setSelectedExecution}
                refreshExecution={refreshExecution}
                setRefreshExecution={setRefreshExecution}
              />
              <div className={cx('box-right')}>
                {activedType === 'execution' && (
                  <Button
                    disabled={!selectedExecution?.objectId}
                    onClick={() =>
                      actionConfirm('该操作会将该测试执行任务删除，是否继续操作？', async () => {
                        await Promise.all([
                          deleteTestEntities([selectedExecution?.objectId]),
                          deleteItems([selectedExecution.reference.objectId]),
                        ]);
                        setSelectedExecution(undefined);
                        setRefreshExecution(true);
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
          <PageLayout.Left>
            <RepositoryFolderTree
              workspaceKey={workspaceKey}
              onFolderSelect={handleFolderSelect}
              scopedTestDetailIds={scopedTestDetailIds}
            />
          </PageLayout.Left>
          <PageLayout.Right>
            <Main />
          </PageLayout.Right>
        </PageLayout>
      )}
    </div>
  );
};

export default PlanPageLayout;
