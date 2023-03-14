import React, { useCallback, useRef, useMemo, useState } from 'react';
import { Button, message, notification, Select, Tooltip } from 'antd';
import FilterSearch from '@/components/common/FilterSearch';
import RepoDropDown from '@/pages/repository/RepoDropDown';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import {
  getExtendFields,
  RepositoryModel,
  TestCaseStatusModel,
  TestLinkType,
  TestType,
} from '@/lib/constants';
import { useUpdateEffect } from 'ahooks';
import { usePageContext } from '../../hook';
import { useSetTableHeight } from './hooks';
import ExecutionStatus from '../ExecutionStatus';
import TestEntityList from '../../TestEntityList';
import { batchCreateTestRun, updateTestEntity } from '@/lib/api/item';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

interface RightProps {
  activeType?: string;
  selectedExecution?: Record<string, any>;
  showType?: string;
  setShowType?: (val: string) => void;
  scopedTestDetailRefresh?: () => void;
  refreshPlanData?: () => void;
  requestScopedTestDetailIds?: string[];
  pageLeftRef?: any;
  scopedTestDetailIds?: string[];
}

const Right: React.FC<RightProps> = props => {
  const {
    activeType,
    selectedExecution,
    showType,
    setShowType,
    scopedTestDetailRefresh,
    refreshPlanData,
    requestScopedTestDetailIds,
    pageLeftRef,
    scopedTestDetailIds,
  } = props;

  const {
    refresh,
    workspaceKey,
    selectedTestPlan,
    setSearchParams,
    mutateTestPlanEvent,
    mutateStatusEvent,
    tableSelectionToggleEvent,
  } = usePageContext();
  const proxima = createProximaSdk();
  const { getCreatePermission } = useBaseAction();
  const { t } = useI18n();

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

  const testDetailFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Case,
    workspaceKey,
  });

  useUpdateEffect(() => {
    if (activeType && selectedExecution?.objectId) {
      detailSearchRef.current.reset();
    }
  }, [activeType, selectedExecution?.objectId]);

  useUpdateEffect(() => {
    if (selectedTestPlan?.objectId) {
      detailSearchRef.current.reset();
    }
  }, [selectedTestPlan?.objectId]);

  const addTestExecutionDetail = useCallback(async () => {
    const { selectedData: caseIds } = await testEntitySelectorRef.current.open();
    if (caseIds?.length === 0) {
      return notification.warning({
        message: t('page.plan.planPageLayout.right.notSelectMessage'),
      });
    }

    try {
      setLoading(true);
      // 创建执行任务
      const { data } = await batchCreateTestRun({
        executionId: selectedExecution.objectId,
        caseIds,
      });
      if (data?.status === 'error') {
        setLoading(false);
        message.error(data.data);
        return;
      }
    } catch (error) {
      setLoading(false);
      console.info('error', error);
    }

    scopedTestDetailRefresh();
    mutateStatusEvent.emit('refreshExecutionStatus');
    setLoading(false);
    notification.success({
      message: t('page.plan.planPageLayout.right.createTestRunSuccessMessage'),
    });
    proxima.execute('refreshTestRunPanel');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExecution, selectedTestPlan, curTestRuns]);

  const filterSearchExtendFieldsProps = useMemo(() => {
    const fieldsMapping = {
      // 测试用例类型筛选，只有测试用例库模块
      TestPlan: getExtendFields(t).filter(field =>
        [TestCaseStatusModel, RepositoryModel].includes(field.key),
      ),
      // 测试执行搜索
      TestExecution: getExtendFields(t),
    };

    return fieldsMapping[activeType];
  }, [activeType, t]);

  const addTestDetail = async () => {
    const itemData = await testEntitySelectorRef.current.open();

    if (!itemData.length) {
      return notification.warning({
        message: t('page.plan.planPageLayout.right.notSelectMessage'),
      });
    }

    try {
      setLoading(true);
      const res = await updateTestEntity(
        itemData.map(item => ({
          objectId: item,
          linkType: TestLinkType.CaseLinkPlan,
          linkItems: {
            action: 'add',
            value: [selectedTestPlan.objectId],
          },
        })),
      );
      if (res?.status === 'error') {
        setLoading(false);
        message.error(res.data);
        return;
      }
    } catch (error) {
      setLoading(false);
      // eslint-disable-next-line no-console
      console.log('error', error);
    }
    scopedTestDetailRefresh();

    mutateTestPlanEvent.emit(selectedTestPlan?.objectId);
    refresh('detailTable');
    refreshPlanData();
    setLoading(false);
    // planDataMutate(selectedTestPlan?.objectId);
    notification.success({
      message: t('page.plan.planPageLayout.right.caseToPlanSuccessMessage'),
    });
  };

  return (
    <div className={cx('right-box')}>
      <div data-element-id="test-manager-execution-table-header" className={cx('box-header')}>
        <div className={cx('extra-content')}>
          <div className={cx('extra-content-left')}>
            {activeType === 'TestExecution' ? (
              <>
                <Tooltip title={selectedExecution?.name ?? ''} placement="topLeft">
                  <div className={cx('title')}>{selectedExecution?.name}</div>
                </Tooltip>
                <div className={cx('rate')}>
                  <ExecutionStatus
                    selectedExecution={selectedExecution}
                    setCurTestRuns={setCurTestRuns}
                  />
                </div>
              </>
            ) : (
              t('common.allTestCase')
            )}
          </div>
          <div className={cx('extra-content-right')}>
            <Select
              className={cx('select-group')}
              value={showType}
              options={[
                {
                  value: 'showChild',
                  label: t('page.plan.planPageLayout.right.showChild'),
                },
                {
                  value: 'showCur',
                  label: t('page.plan.planPageLayout.right.showCur'),
                },
              ]}
              onChange={val => setShowType(val)}
            ></Select>
            <Button className={cx('action')} onClick={() => toggleTableSelection()}>
              {tableSelectionVisible ? t('common.cancelAction') : t('common.batchAction')}
            </Button>
            <>
              <Button
                type="primary"
                onClick={activeType === 'TestPlan' ? addTestDetail : addTestExecutionDetail}
                className={cx('action')}
                disabled={!selectedTestPlan || getCreatePermission(TestType.Case)}
              >
                {t('common.planCase')}
              </Button>
              <RepoDropDown
                type="plan"
                className={cx('action')}
                selectedTestPlanId={selectedTestPlan?.objectId}
              />
            </>
          </div>
        </div>
        <FilterSearch
          ref={detailSearchRef}
          onSearch={setSearchParams}
          className={cx('plan-page-layout-search')}
          extendFields={filterSearchExtendFieldsProps}
          fields={getFilterFields(testDetailFieldKeys)}
          testType={TestType.Case}
        />
      </div>
      <div data-element-id="test-manager-execution-table-body" className={cx('box-body')}>
        <TestEntityList
          loading={loading}
          activeType={activeType}
          requestScopedTestDetailIds={requestScopedTestDetailIds}
          selectedExecution={selectedExecution}
          scopedTestDetailRefresh={scopedTestDetailRefresh}
          refreshPlanData={refreshPlanData}
          tableSelectionVisible={tableSelectionVisible}
          testDetailFieldKeys={testDetailFieldKeys}
        />
        <TestEntitySelectorModal
          title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
          testType={TestType.Case}
          actionRef={testEntitySelectorRef}
          afterClose={() => {
            pageLeftRef.current?.refresh();
          }}
          ignoreTestEntityIds={scopedTestDetailIds}
          planId={activeType === 'TestPlan' ? '' : selectedTestPlan?.objectId}
        />
      </div>
    </div>
  );
};

export default Right;
