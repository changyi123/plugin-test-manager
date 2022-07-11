/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
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
import { useScopedTestDetailIds } from './hooks';
import { createTestRelation, deleteTestEntities } from '@/lib/api/common';
import { deleteItems } from '@/lib/api/proxima';
import { usePageContext } from '../hook';
import ExecutionList from './ExecutionList';
import { useResizeContainerDOM } from './hooks';
import RepositoryFolderTree from '@/components/business/RepositoryFolderTree';

import cx from './index.less';
import TestEntityList from '../TestEntityList';
import SearchInput from '@/components/business/SearchInput';
import RepoDropDown from '@/pages/repository/RepoDropDown';
import TestEntitySelectorModal, { ActionType } from '@/components/business/TestEntitySelectorModal';

const PlanPageLayout: React.FC<any> = () => {
  const {
    refresh,
    workspaceKey,
    selectedTestPlan,
    searchValue,
    setSearchValue,
    setSelectedTestPlan,
    mutateTestPlanEvent,
    tableSelectionToggleEvent,
  } = usePageContext();
  const { createItemUseModal } = useBaseAction();
  const [requestScopedTestDetailIds, setRequestScopedTestDetailIds] = React.useState<
    string[] | undefined
  >(undefined);
  useResizeContainerDOM(selectedTestPlan?.objectId);
  const testEntitySelectorRef = React.useRef<ActionType>();
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);

  const [activedType, setActivedType] = useState('TestPlan');
  const [selectedExecution, setSelectedExecution] = useState<Record<string, any> | undefined>(
    undefined,
  );
  const [refreshExecution, setRefreshExecution] = useState(false);
  const [value, setValue] = useState('');

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
  const { data: scopedTestDetail } = useScopedTestDetailIds({
    workspaceKey,
    type: activedType === 'TestPlan' ? 'Plan' : 'Execution',
    testPlanId: selectedTestPlan?.objectId,
    testExecutionId: selectedExecution?.objectId,
  });

  useEffect(() => {
    searchValue && setSearchValue('');
  }, [activedType, selectedExecution]);

  // 处理 folder tree change
  const handleFolderSelect = ids => {
    setRequestScopedTestDetailIds(ids);
  };

  useEffect(() => {
    if (activedType === 'TestPlan') {
      selectedExecution && setSelectedExecution(undefined);
    }
  }, [activedType]);

  const toggleTableSelection = (visible?: boolean) => {
    visible = typeof visible === 'boolean' ? visible : !tableSelectionVisible;
    tableSelectionToggleEvent.emit(visible);
    setTableSelectionVisible(visible);
  };

  tableSelectionToggleEvent.useSubscription(visible => {
    setTableSelectionVisible(visible);
  });

  const addTestDetail = async () => {
    const testDetailIds = await testEntitySelectorRef.current.open();

    const ignoreTestDetailIds = selectedTestPlan?.refTestDetails?.map(item => item.objectId) ?? [];
    const relations = testDetailIds
      .filter(d => !ignoreTestDetailIds.includes(d))
      .map(testPlanId => ({
        relationType: TestRelationType.PlanRelDetail,
        from: selectedTestPlan?.objectId,
        to: testPlanId,
      }));

    if (!relations.length) {
      return notification.warning({
        message: '未选择测试用例',
      });
    }

    try {
      await createTestRelation(relations);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('error', error);
    }
    // await allTestDetailIdsRefresh();

    mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
    // actionRef.current.refresh();
    refresh('detailTable');
    notification.success({
      message: '测试用例已成功添加至测试计划中',
    });
  };

  const getRate = (statusData = []) => {
    const filterStatusByType = type => statusData.filter(d => d === type);

    return Math.floor(filterStatusByType('PASS').length / statusData.length);
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
                    className={cx('tab-title', activedType === 'TestPlan' ? 'actived' : '')}
                    onClick={() => {
                      tableSelectionToggleEvent.emit(false);
                      setActivedType('TestPlan');
                    }}
                  >
                    全部用例
                  </div>
                  <div
                    className={cx('tab-title', activedType === 'TestExecution' ? 'actived' : '')}
                    onClick={() => {
                      tableSelectionToggleEvent.emit(false);
                      setActivedType('TestExecution');
                    }}
                  >
                    测试执行任务
                  </div>
                </div>
              </div>
              <div className={cx('header-right')}>
                {activedType === 'TestExecution' && (
                  <div className={cx('complete-rate-box')}>
                    <span className={cx('rate')}>
                      完成率 {getRate(scopedTestDetail?.scopedTestDetailStatus)}%
                    </span>
                    <div className={cx('progress')}>
                      <StatusProgress
                        hasSummary
                        statuses={scopedTestDetail?.scopedTestDetailStatus}
                      />
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
                {/* {activedType === 'TestExecution' && (
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
                )} */}
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
              scopedTestDetailIds={scopedTestDetail?.scopedTestDetailIds}
            />
          </PageLayout.Left>
          <PageLayout.Right>
            <div className={cx('extra-content')}>
              <div className={cx('extra-content-left')}>1111</div>
              <div className={cx('extra-content-right')}>
                <SearchInput
                  showInput
                  allowClear
                  defaultValue={value}
                  className={cx('action')}
                  placeholder={'请输入测试用例标题'}
                  onChange={val => setValue(val)}
                  onSearch={val => {
                    setSearchValue(val);
                  }}
                />
                <Button className={cx('action')} onClick={() => toggleTableSelection()}>
                  {tableSelectionVisible ? '取消操作' : '批量操作'}
                </Button>
                <>
                  <Button
                    type="primary"
                    onClick={addTestDetail}
                    className={cx('action')}
                    disabled={!selectedTestPlan}
                  >
                    规划用例
                  </Button>
                  <RepoDropDown
                    type="plan"
                    className={cx('action')}
                    selectedTestPlanId={selectedTestPlan?.objectId}
                  />
                </>
              </div>
            </div>
            <TestEntityList
              activedType={activedType}
              requestScopedTestDetailIds={requestScopedTestDetailIds}
            />
            <TestEntitySelectorModal
              title="选择规划的测试用例"
              testType={TestType.TestDetail}
              actionRef={testEntitySelectorRef}
              ignoreTestEntityIds={
                selectedTestPlan?.refTestDetails?.map(item => item.objectId) ?? []
              }
            />
          </PageLayout.Right>
        </PageLayout>
      )}
    </div>
  );
};

export default PlanPageLayout;
