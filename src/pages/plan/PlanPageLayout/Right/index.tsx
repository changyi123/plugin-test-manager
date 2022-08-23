import React, { useCallback, useRef, useMemo, useState } from 'react';
import { Button, notification, Select, Tooltip } from 'antd';
import FilterSearch from '@/components/common/FilterSearch';
import RepoDropDown from '@/pages/repository/RepoDropDown';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import { extendFields, RepositoryModel, TestRelationType, TestType } from '@/lib/constants';
import { addTestDetailToExecution } from '@/lib/api/runs';
import { createTestRelation } from '@/lib/api/common';
import { useUpdateEffect } from 'ahooks';
import TestEntityList from '../../TestEntityList';
import { usePageContext } from '../../hook';
import { useSetTableHeight } from './hooks';
import ExecutionStatus from '../ExecutionStatus';
import WordReport from '@/lib/report';
import { getFirstWordTemplate } from '@/lib/api/report';

import cx from './index.less';

const options = [
  {
    value: 'showChild',
    label: '显示子分组用例',
  },
  {
    value: 'showCur',
    label: '显示当前分组用例',
  },
];

interface RightProps {
  activedType?: string;
  selectedExecution?: Record<string, any>;
  showType?: string;
  setShowType?: (val: string) => void;
  scopedTestDetailRefresh?: () => void;
  refreshPlanData?: () => void;
  requestScopedTestDetailIds?: string[];
  pageLeftRef?: any;
}

const Right: React.FC<RightProps> = props => {
  const {
    activedType,
    selectedExecution,
    showType,
    setShowType,
    scopedTestDetailRefresh,
    refreshPlanData,
    requestScopedTestDetailIds,
    pageLeftRef,
  } = props;

  const {
    refresh,
    selectedTestPlan,
    setSearchParams,
    mutateTestPlanEvent,
    mutateStatusEvent,
    tableSelectionToggleEvent,
  } = usePageContext();

  useSetTableHeight();

  const testEntitySelectorRef = useRef<ModelActionType>();
  const detailSearchRef = useRef(null);
  const [curTestRuns, setCurTestRuns] = useState<Record<string, any>[] | undefined>(undefined);

  const [tableSelectionVisible, setTableSelectionVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleTableSelection = (visible?: boolean) => {
    visible = typeof visible === 'boolean' ? visible : !tableSelectionVisible;
    tableSelectionToggleEvent.emit(visible);
    setTableSelectionVisible(visible);
  };

  tableSelectionToggleEvent.useSubscription(visible => {
    setTableSelectionVisible(visible);
  });

  useUpdateEffect(() => {
    if (activedType && selectedExecution?.objectId) {
      detailSearchRef.current.reset();
    }
  }, [activedType, selectedExecution?.objectId]);

  useUpdateEffect(() => {
    if (selectedTestPlan?.objectId) {
      detailSearchRef.current.reset();
    }
  }, [selectedTestPlan?.objectId]);

  const addTestExecutionDetail = useCallback(async () => {
    const ignoreTestDetailIds = curTestRuns
      .map(run => run.runReferenceDetail?.objectId)
      .filter(Boolean);

    const testDetailIds = await testEntitySelectorRef.current.open();
    setLoading(true);

    // 去重
    const newTestDetailIds = testDetailIds.filter(d => !ignoreTestDetailIds.includes(d));

    await addTestDetailToExecution({
      testDetail: newTestDetailIds,
      testPlan: selectedTestPlan?.objectId,
      testExecution: selectedExecution.objectId,
      workspaceKey: selectedExecution.workspaceKey,
    });

    scopedTestDetailRefresh();
    mutateStatusEvent.emit('refreshExecutionStatus');
    setLoading(false);
    notification.success({
      message: '用例执行创建成功',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExecution, curTestRuns]);

  const filterSearchExtendFieldsProps = useMemo(() => {
    const fieldsMapping = {
      // 测试用例类型筛选，只有测试用例库模块
      TestPlan: extendFields.filter(field => field.key === RepositoryModel),
      // 测试执行搜索
      TestExecution: extendFields,
    };

    return fieldsMapping[activedType];
  }, [activedType]);

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
    refreshPlanData();
    // planDataMutate(selectedTestPlan?.objectId);
    notification.success({
      message: '测试用例已成功添加至测试计划中',
    });
  };

  const generateReport = async () => {
    // TODO: 选取测试报告，当前只取系统第一个
    const wordTemplate = await getFirstWordTemplate();
    new WordReport(wordTemplate).generateReport({
      fileName: `${selectedTestPlan.reference.name}-测试报告`,
      testPlanIds: [selectedTestPlan?.objectId],
    });
  };

  return (
    <div className={cx('right-box')}>
      <div data-element-id="test-manager-execution-table-header" className={cx('box-header')}>
        <div className={cx('extra-content')}>
          <div className={cx('extra-content-left')}>
            {activedType === 'TestExecution' ? (
              <>
                <Tooltip title={selectedExecution?.reference.name ?? ''} placement="topLeft">
                  <div className={cx('title')}>{selectedExecution?.reference.name}</div>
                </Tooltip>
                <div className={cx('rate')}>
                  <ExecutionStatus
                    selectedExecution={selectedExecution}
                    setCurTestRuns={setCurTestRuns}
                  />
                </div>
              </>
            ) : (
              '全部用例'
            )}
          </div>
          <div className={cx('extra-content-right')}>
            <Select
              className={cx('select-group')}
              value={showType}
              options={options}
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
                extraMenuOptions={[
                  {
                    children: '生成测试报告',
                    onClick: generateReport,
                  },
                ]}
              />
            </>
          </div>
        </div>
        <FilterSearch
          ref={detailSearchRef}
          onSearch={setSearchParams}
          className={cx('plan-page-layout-search')}
          extendFields={filterSearchExtendFieldsProps}
          fields={['createdBy', 'priority', 'assignee', 'createdAt']}
        />
      </div>
      <div data-element-id="test-manager-execution-table-body" className={cx('box-body')}>
        <TestEntityList
          loading={loading}
          activedType={activedType}
          requestScopedTestDetailIds={requestScopedTestDetailIds}
          selectedExecution={selectedExecution}
          scopedTestDetailRefresh={scopedTestDetailRefresh}
          refreshPlanData={refreshPlanData}
          tableSelectionVisible={tableSelectionVisible}
        />
        <TestEntitySelectorModal
          title="选择规划的测试用例"
          testType={TestType.TestDetail}
          actionRef={testEntitySelectorRef}
          afterClose={() => {
            pageLeftRef.current?.refresh();
          }}
          ignoreTestEntityIds={
            activedType === 'TestPlan'
              ? selectedTestPlan?.refTestDetails?.map(item => item.objectId) ?? []
              : curTestRuns?.map(run => run.runReferenceDetail?.objectId) ?? []
          }
        />
      </div>
    </div>
  );
};

export default Right;
