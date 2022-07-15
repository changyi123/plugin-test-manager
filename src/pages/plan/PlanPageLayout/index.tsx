/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Spin, notification, Select } from 'antd';
import TestPlanList from '@/components/business/TestPlanList';
import PageLayout from '@/components/common/PageLayout';
import { ArrowLeftOutlined } from '@ant-design/icons';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import { addTestDetailToExecution, createTestExecutionAndRelations } from '@/lib/api/runs';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestRelationType, TestType } from '@/lib/constants';
import { useScopedTestDetailIds } from './hooks';
import { createTestRelation } from '@/lib/api/common';
import { usePageContext } from '../hook';
import ExecutionList from './ExecutionList';
import { useResizeContainerDOM } from './hooks';
import RepositoryFolderTree, {
  ActionType as FolderTreeActionType,
} from '@/components/business/RepositoryFolderTree';
import TestEntityList from '../TestEntityList';
import SearchInput from '@/components/business/SearchInput';
import RepoDropDown from '@/pages/repository/RepoDropDown';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import { useLocation } from 'react-router-dom';
import useGetTestPlanById from '@/components/business/TestPlanList/hooks';
import ExecutionStatus from './ExecutionStatus';

import cx from './index.less';

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
  const testEntitySelectorRef = React.useRef<ModelActionType>();
  const folderTreeRef = React.useRef<FolderTreeActionType>();
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);

  const [activedType, setActivedType] = useState('TestPlan');
  const [selectedExecution, setSelectedExecution] = useState<Record<string, any> | undefined>(
    undefined,
  );
  const [curTestRuns, setCurTestRuns] = useState<Record<string, any>[] | undefined>(undefined);

  const [refreshExecution, setRefreshExecution] = useState(false);
  const [value, setValue] = useState('');
  const [foldSearchValue, setFoldSearchValue] = useState('');
  const [showType, setShowType] = useState('showCur');
  const [loading, setLoading] = useState(false);

  const { query } = useLocation();
  const { data: planData } = useGetTestPlanById(query?.planId);

  useEffect(() => {
    if (query?.planId && planData?.list?.length && !selectedTestPlan) {
      const curPlan: any = planData?.list.find(d => d.objectId === query?.planId);
      curPlan && setSelectedTestPlan(curPlan);
    }
  }, [planData, query?.planId]);

  useEffect(() => {
    if (query?.actionType && !activedType) {
      setActivedType(query?.actionType);
    }
  }, [query?.actionType]);

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
  const { data: scopedTestDetailIds, refresh: scopedTestDetailRefresh } = useScopedTestDetailIds({
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

  const addTestExecutionDetail = useCallback(async () => {
    const ignoreTestDetailIds = selectedExecution.testRuns
      .map(run => run.runReferenceDetail?.objectId)
      .filter(Boolean);
    setLoading(true);

    const testDetailIds = await testEntitySelectorRef.current.open();

    // 去重
    const newTestDetailIds = testDetailIds.filter(d => !ignoreTestDetailIds.includes(d));

    await addTestDetailToExecution({
      testDetail: newTestDetailIds,
      testPlan: selectedTestPlan?.objectId,
      testExecution: selectedExecution.objectId,
      workspaceKey: selectedExecution.workspaceKey,
    });

    scopedTestDetailRefresh();
    setLoading(false);
    notification.success({
      message: '测试执行创建成功',
    });
  }, [selectedExecution]);

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
    scopedTestDetailRefresh();

    mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
    refresh('detailTable');
    notification.success({
      message: '测试用例已成功添加至测试计划中',
    });
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
                  <ExecutionStatus
                    selectedExecution={selectedExecution}
                    setCurTestRuns={setCurTestRuns}
                  />
                )}
              </div>
            </div>
            {activedType === 'TestExecution' && (
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
                  <Button type="primary" onClick={createTestExecution}>
                    新建测试执行任务
                  </Button>
                </div>
              </div>
            )}
          </PageLayout.Header>
          <PageLayout.Left>
            <SearchInput
              showInput
              allowClear
              className={cx('fold-search')}
              defaultValue={foldSearchValue}
              placeholder={'请输入用例库标题'}
              onChange={val => setFoldSearchValue(val)}
              onSearch={val => {
                folderTreeRef.current.filterFolder(val);
              }}
            />
            <RepositoryFolderTree
              actionRef={folderTreeRef}
              shouldIncludeSubFolder={showType === 'showChild'}
              workspaceKey={workspaceKey}
              onFolderSelect={handleFolderSelect}
              scopedTestDetailIds={scopedTestDetailIds}
            />
          </PageLayout.Left>
          <PageLayout.Right>
            <div className={cx('extra-content')}>
              <div className={cx('extra-content-left')}>
                {activedType === 'TestExecution' ? selectedExecution?.reference.name : '全部用例'}
              </div>
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
                <Select
                  value={showType}
                  options={[
                    {
                      value: 'showChild',
                      label: '显示子分组用例',
                    },
                    {
                      value: 'showCur',
                      label: '显示当前分组用例',
                    },
                  ]}
                  onChange={val => setShowType(val)}
                ></Select>
                <Button className={cx('action')} onClick={() => toggleTableSelection()}>
                  {tableSelectionVisible ? '取消操作' : '批量操作'}
                </Button>
                <>
                  <Button
                    type="primary"
                    onClick={activedType === 'TestPlan' ? addTestDetail : addTestExecutionDetail}
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
              loading={loading}
              activedType={activedType}
              requestScopedTestDetailIds={requestScopedTestDetailIds}
              selectedExecution={selectedExecution}
              curTestRuns={curTestRuns}
              scopedTestDetailRefresh={scopedTestDetailRefresh}
            />
            <TestEntitySelectorModal
              title="选择规划的测试用例"
              testType={TestType.TestDetail}
              actionRef={testEntitySelectorRef}
              ignoreTestEntityIds={
                activedType === 'TestPlan'
                  ? selectedTestPlan?.refTestDetails?.map(item => item.objectId) ?? []
                  : selectedExecution?.testRuns?.map(d => d.objectId) ?? []
              }
            />
          </PageLayout.Right>
        </PageLayout>
      )}
    </div>
  );
};

export default PlanPageLayout;
