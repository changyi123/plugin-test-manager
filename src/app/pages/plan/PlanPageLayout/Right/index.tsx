import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useUpdateEffect } from 'ahooks';
import { Button, Dropdown, message, notification, Select, Space, Tooltip } from 'antd';
import { QueryLinkedTestEntityPayload } from 'common/types/api';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  createTestRunWithProcess,
  updateItemsWithProcess,
} from '@/components/business/BatchResult/hooks';
import RepositoryFolderTree, {
  ActionType as FolderTreeActionType,
} from '@/components/business/RepositoryFolderTree';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { DownOutlined } from '@/icons';
import {
  CASESNAPSHOT_TYPE,
  getExtendFields,
  RepositoryModel,
  TestFiledKeyMapping,
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
import { useTestConfig } from '@/lib/hooks/useContext';
import cx from './index.less';

interface RightProps {
  activeType?: string;
  selectedExecution?: Record<string, any>;
  showType?: string;
  setShowType?: (val: string) => void;
  refreshTreeAndScopeTestCase?: () => void;
  selectNode?: Record<string, unknown>;
  showRepoDropDown?: boolean;
  treeParams?: QueryLinkedTestEntityPayload;
  /** 目录被选中 */
  onFolderSelect?: (node?: any) => void;
}

const Right: React.FC<RightProps> = props => {
  const {
    activeType,
    selectedExecution,
    showType,
    setShowType,
    refreshTreeAndScopeTestCase,
    selectNode,
    showRepoDropDown = true,
    treeParams,
    onFolderSelect,
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
    workspaceKey,
  } = usePageContext();
  const { config } = useTestConfig();
  const proxima = createProximaSdk();
  const { getCreatePermission, testCaseFieldKeys } = useBaseAction();
  const { t } = useI18n();
  const { pathname } = useLocation();

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
    const { selectedData: caseIds, caseVersion } = await testEntitySelectorRef.current.open();
    if (caseIds?.length === 0) {
      return notification.warning({
        message: t('page.plan.planPageLayout.right.notSelectMessage'),
      });
    }

    const handleFail = error => {
      setLoading(false);
      message.error(error.message);
    };

    try {
      setLoading(true);
      // 创建执行任务
      await createTestRunWithProcess({
        execution: selectedExecution as any,
        caseIds,
        caseVersion,
        workspace: selectedExecution?.workspace as any,
        planId: selectedExecution?.linkItems?.[0],
        handleSuccess: async () => {
          await refreshTreeAndScopeTestCase();
          mutateStatusEvent.emit('refreshExecutionStatus');
          mutateStatusEvent.emit('refreshExecutionList');
          setLoading(false);
          notification.success({
            message: t('page.plan.planPageLayout.right.createTestRunSuccessMessage'),
          });
          // 刷新详情页 pane
          proxima.execute('refreshTestRunPanel');
        },
        handleFail,
      });
    } catch (error) {
      handleFail(error);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExecution, selectedTestPlan]);

  const filterSearchExtendFieldsProps = useMemo(() => {
    const fieldsMapping = {
      // 测试用例类型筛选，只有测试用例库模块
      TestPlan: getExtendFields(t).filter(field =>
        [RepositoryModel, '测试用例集'].includes(field.key),
      ),
      // 测试执行搜索
      TestExecution: getExtendFields(t),
    };

    return fieldsMapping[activeType];
  }, [activeType, t]);

  const addTestDetail = async () => {
    const { selectedData: itemData } = await testEntitySelectorRef.current.open();

    if (!itemData.length) {
      return notification.warning({
        message: t('page.plan.planPageLayout.right.notSelectMessage'),
      });
    }

    setLoading(true);
    await updateItemsWithProcess({
      title: '用例规划中',
      items: itemData,
      fields: {
        values: { [TestFiledKeyMapping.linkType]: TestLinkType.CaseLinkPlan },
      },
      update: {
        [TestFiledKeyMapping.linkItems]: {
          concat: [selectedTestPlan.objectId],
        },
        [TestFiledKeyMapping.testPlans]: {
          concat: [selectedTestPlan.objectId],
        },
      },
      handleSuccess: () => {
        refresh('detailTable');
        setTimeout(() => {
          refreshTreeAndScopeTestCase();
          mutateTestTableList.emit('refreshTable');
        }, 500);
        setLoading(false);
        notification.success({
          message: t('page.plan.planPageLayout.right.caseToPlanSuccessMessage'),
        });
      },
      handleFail: error => {
        setLoading(false);
        message.error(error.message);
      },
    });
  };

  const renderDropdown = (
    <Dropdown
      // open={true}
      dropdownRender={menu => (
        <div className={cx('right-box-dropdown-content')}>
          <RepositoryFolderTree
            hideEmptyFolder
            // actionRef={folderTreeRef}
            workspaceKey={workspaceKey}
            params={treeParams}
            onFolderSelect={onFolderSelect}
            isShowAll={false}
          />
        </div>
      )}
    >
      <div className={cx('right-box-dropdown-text')}>
        <div className={cx('right-box-text')}>{selectNode?.name || t('common.allTestCase')}</div>
        <DownOutlined style={{ color: '#b4bac6' }} />
      </div>
    </Dropdown>
  );
  return (
    <div className={cx('right-box')}>
      <div data-element-id="test-manager-execution-table-header" className={cx('box-header')}>
        <div className={cx('extra-content')}>
          <div className={cx('extra-content-left')}>
            {activeType === 'TestExecution' ? (
              <Space size={10}>
                {['/plan'].includes(pathname) && renderDropdown}
                <Tooltip title={selectedExecution?.name ?? ''} placement="topLeft">
                  <div className={cx('title')}>{selectedExecution?.name}</div>
                </Tooltip>
                <div className={cx('rate')}>
                  <ExecutionStatus
                    selectedExecution={selectedExecution}
                    // setCurTestRuns={setCurTestRuns}
                  />
                </div>
              </Space>
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
              {showRepoDropDown && (
                <RepoDropDown
                  type="plan"
                  className={cx('action')}
                  selectedTestPlanId={selectedTestPlan?.objectId}
                />
              )}
            </>
          </div>
        </div>
        <FilterSearch
          ref={detailSearchRef}
          onSearch={setSearchParams}
          className={cx('plan-page-layout-search')}
          extendFields={filterSearchExtendFieldsProps}
          fields={getFilterFields([].concat(SystemFieldKeys, testCaseFieldKeys, 'r_test_manager_isCaseUpdate'))}
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
          showDefaultRange
          testType={TestType.Case}
          enableCaseVersion={[CASESNAPSHOT_TYPE.NO_BUILDVERSION_SELVERSION].includes(config?.caseSnapshot?.type) && activeType === 'TestExecution'}
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
