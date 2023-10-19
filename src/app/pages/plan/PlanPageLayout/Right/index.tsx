import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useUpdateEffect } from 'ahooks';
import { Button, message, notification, Select, Tooltip } from 'antd';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { batchCreateTestRun, updateTestEntity } from '@/lib/api/item';
import {
  getExtendFields,
  RepositoryModel,
  TestCaseStatusModel,
  TestLinkType,
  TestType,
} from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import RepoDropDown from '@/pages/repository/RepoDropDown';

import { usePageContext } from '../../hook';
import TestEntityList from '../../TestEntityList';
import ExecutionStatus from '../ExecutionStatus';
import { useSetTableHeight } from './hooks';
import cx from './index.less';

interface RightProps {
  activeType?: string;
  selectedExecution?: Record<string, any>;
  showType?: string;
  setShowType?: (val: string) => void;
  refreshTreeAndScopeTestCase?: () => void;
  selectNode?: Record<string, unknown>;
}

const Right: React.FC<RightProps> = props => {
  const {
    activeType,
    selectedExecution,
    showType,
    setShowType,
    refreshTreeAndScopeTestCase,
    selectNode,
  } = props;

  const {
    refresh,
    selectedTestPlan,
    setSearchParams,
    planLinkCaseIds,
    runLinkCaseIds,
    mutateStatusEvent,
    mutateTestTableList,
    tableSelectionToggleEvent,
  } = usePageContext();
  const proxima = createProximaSdk();
  const { getCreatePermission, testCaseFieldKeys } = useBaseAction();
  const { t } = useI18n();

  useSetTableHeight();

  const testEntitySelectorRef = useRef<ModelActionType>();
  const detailSearchRef = useRef(null);
  // const [curTestRuns, setCurTestRuns] = useState<Record<string, any>[] | undefined>(undefined);

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

    await refreshTreeAndScopeTestCase();
    mutateStatusEvent.emit('refreshExecutionStatus');
    setLoading(false);
    notification.success({
      message: t('page.plan.planPageLayout.right.createTestRunSuccessMessage'),
    });
    // 刷新详情页 pane
    proxima.execute('refreshTestRunPanel');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExecution, selectedTestPlan]);

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

    refresh('detailTable');
    setTimeout(() => {
      refreshTreeAndScopeTestCase();
      mutateTestTableList.emit('refreshTable');
    }, 500);
    setLoading(false);
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
                    // setCurTestRuns={setCurTestRuns}
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
                  value: 'all',
                  label: t('page.plan.planPageLayout.right.showChild'),
                },
                {
                  value: 'current',
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
          fields={getFilterFields([].concat(SystemFieldKeys, testCaseFieldKeys))}
          testType={TestType.Case}
          storageKey={activeType === 'TestPlan' ? 'testPlan' : 'testExecution'}
        />
      </div>
      <div data-element-id="test-manager-execution-table-body" className={cx('box-body')}>
        <TestEntityList
          loading={loading}
          activeType={activeType}
          showType={showType}
          selectedExecution={selectedExecution}
          tableSelectionVisible={tableSelectionVisible}
          selectNode={selectNode}
          refreshTreeAndScopeTestCase={refreshTreeAndScopeTestCase}
        />
        <TestEntitySelectorModal
          title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
          testType={TestType.Case}
          actionRef={testEntitySelectorRef}
          afterClose={() => refreshTreeAndScopeTestCase?.()}
          ignoreTestEntityIds={activeType === 'TestPlan' ? planLinkCaseIds : runLinkCaseIds}
          planId={activeType === 'TestPlan' ? '' : selectedTestPlan?.objectId}
        />
      </div>
    </div>
  );
};

export default Right;
