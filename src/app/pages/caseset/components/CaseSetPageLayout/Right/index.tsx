import { useUpdateEffect } from 'ahooks';
import { Button, Dropdown, Menu, message, notification, Tooltip } from 'antd';
import { components, hooks } from 'proxima-sdk';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { updateItemsWithProcess } from '@/components/business/BatchResult/hooks';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { CustomMore } from '@/icons';
import { searchFields } from '@/lib/api/proxima';
import { getAppEnv } from '@/lib/appEnv';
import {
  AppKey,
  EXPORT_EXCLUDED_TYPES,
  EXPORT_ITEM_FIELDS,
  EXPORT_TEST_FIELDS,
  getExtendFields,
  RepositoryModel,
  TestCaseStatusModel,
  TestFiledKeyMapping,
  TestType,
} from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getProximaBasePath, getTenantKey, inIframe } from '@/lib/utils/helper';
import { usePageContext } from '@/pages/caseset/components/hook';
import TestEntityList from '@/pages/caseset/components/TestEntityList';

import { useSetTableHeight } from './hooks';
import cx from './index.less';

const { ExportModal } = components.Components;
const { FilterProvider, RecoilRoot } = hooks;
interface RightProps {
  activeType?: string;
  selectedExecution?: Record<string, any>;
  showType?: string;
  setShowType?: (val: string) => void;
  refreshTreeAndScopeTestCase?: () => void;
  selectNode?: Record<string, unknown>;
  showRepoDropDown?: boolean;
}

const Right: React.FC<RightProps> = props => {
  const { activeType, selectedExecution, showType, refreshTreeAndScopeTestCase, selectNode } =
    props;

  const {
    refresh,
    setSearchParams,
    selectedTestCaseSet,
    mutateTestTableList,
    tableSelectionToggleEvent,
  } = usePageContext();
  const { workspace } = useTestConfig();
  const { testCaseFieldKeys, createItemUseModal, getCreatePermission } = useBaseAction();
  const { t } = useI18n();

  useSetTableHeight();

  const testEntitySelectorRef = useRef<ModelActionType>();
  const detailSearchRef = useRef(null);

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
    if (selectedTestCaseSet?.objectId) {
      detailSearchRef.current.reset();
    }
  }, [selectedTestCaseSet?.objectId]);

  const [testCaseFields, setTestCaseFields] = useState([]);

  useEffect(() => {
    testCaseFieldKeys?.length &&
      searchFields({
        keys: [...testCaseFieldKeys, ...SystemFieldKeys],
        propertyNames: ['name', 'key', 'fieldType'],
        fieldType: true,
      }).then(data => {
        setTestCaseFields(data.filter(f => !EXPORT_EXCLUDED_TYPES.includes(f.fieldType?.key)));
      });
  }, [testCaseFieldKeys]);

  const basicFields = useMemo(() => {
    const basic = [...EXPORT_ITEM_FIELDS, ...EXPORT_TEST_FIELDS];
    const fields = basic;

    return fields.map(field => {
      return {
        ...field,
        label: t(`page.repository.repoDropDown.excelExportTitle.${field.label}`),
        checked: true,
        readonly: true,
      };
    });
  }, [t]);

  const appFields = useMemo(() => {
    const moreFields = testCaseFields
      .filter(field => !EXPORT_ITEM_FIELDS.some(f => f.value === field.key))
      .map(field => ({ value: field.key, label: field.name }));
    return [...basicFields, ...moreFields];
  }, [testCaseFields, basicFields]);

  const extraParams = useMemo(
    () => ({
      testCaseId: selectedTestCaseSet.objectId,
      iqlContext: {
        displayContext: AppKey,
      },
      fileName: `${t('page.repository.repoDropDown.importRepoCase')}-${workspace?.name}`,
    }),
    [selectedTestCaseSet, t, workspace?.name],
  );

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

  const [refrehCaseIdKey, setRefrehCaseIdKey] = useState(0);

  const refreshTreeAndScopeTestCaseWrapper = useCallback(() => {
    refreshTreeAndScopeTestCase?.();
    setRefrehCaseIdKey(refrehCaseIdKey + 1);
  }, [refreshTreeAndScopeTestCase, setRefrehCaseIdKey]);

  const handleCreateCase = async () => {
    const itemData = await createItemUseModal({
      type: TestType.Case,
      extraData: {
        isDisableCreateNext: true,
      },
    });

    await updateItemsWithProcess({
      title: '用例规划中',
      items: [itemData?.item?.objectId],
      fields: {
        values: {},
      },
      update: {
        [TestFiledKeyMapping.testSet]: {
          add: selectedTestCaseSet.objectId,
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
          message: t('page.testset.CaseSetPageLayout.right.caseToTestCaseSetSuccessMessage'),
        });
      },
      handleFail: error => {
        setLoading(false);
        message.error(error.message);
      },
    });
  };
  const [exportShow, setExportShow] = useState(false);
  const [iql, setIql] = useState('');

  const moreMenuClick = useCallback(
    async e => {
      const key = e.key;
      if (key === 'exportTask') {
        // setIql(); // todo这个需要确认怎么传递参数
        setExportShow(true);
        return;
      }
      if (key === 'importTask') {
        const appendedQueryString = inIframe() ? '&hiddenSider=true&hiddenHeader=true' : '';
        const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
        // 跳转到导入页面
        const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspace.key}/import/${
          workspace.objectId
        }?app=test_manager&disableToggleWorkspace=true&hiddenItemType=true&validateRequired=${getAppEnv(
          'GROUP_REQUIRED_WHEN_VALIDATE',
        )}${appendedQueryString}`;
        window.open(href);
      }
    },
    [t, setExportShow],
  );
  // // 右侧...按钮折叠菜单
  const moreMenu = useMemo(() => {
    return (
      <Menu onClick={e => moreMenuClick(e)}>
        <Menu.Item key="exportTask">{t('common.exportJson')}</Menu.Item>
        <Menu.Item key="importTask">{t('common.importJson')}</Menu.Item>
      </Menu>
    );
  }, [moreMenuClick, t]);

  const menuClick = useCallback(
    async e => {
      const key = e.key;
      if (key === 'addNewTestCase') {
        await handleCreateCase();
        return;
      }
      if (key === 'addHaveTestCase') {
        await addTestDetailFromExistCase();
      }
    },
    [t],
  );

  const menu = useMemo(() => {
    return (
      <Menu onClick={e => menuClick(e)}>
        <Menu.Item key="addNewTestCase">
          {t('modules.panel.testCaseSet.testAddPanel.newTestCase')}
        </Menu.Item>
        <Menu.Item key="addHaveTestCase">
          {t('modules.panel.testCaseSet.testAddPanel.addHaveTestCase')}
        </Menu.Item>
      </Menu>
    );
  }, [menuClick, t]);

  const addTestDetailFromExistCase = async () => {
    const itemData = await testEntitySelectorRef.current.open();

    if (!itemData.length) {
      return notification.warning({
        message: t('page.testset.CaseSetPageLayout.right.notSelectMessage'),
      });
    }

    setLoading(true);
    await updateItemsWithProcess({
      title: '用例规划中',
      items: itemData,
      fields: {
        values: {},
      },
      update: {
        [TestFiledKeyMapping.testSet]: {
          add: selectedTestCaseSet.objectId,
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
          message: t('page.testset.CaseSetPageLayout.right.caseBatchToTestCaseSetSuccessMessage'),
        });
      },
      handleFail: error => {
        setLoading(false);
        message.error(error.message);
      },
    });
  };

  return (
    <div className={cx('right-box')}>
      <div data-element-id="test-manager-caseset-table-header" className={cx('box-header')}>
        <div className={cx('extra-content')}>
          <div className={cx('extra-content-left')}>
            <>
              <Tooltip title={selectedExecution?.name ?? ''} placement="topLeft">
                <div className={cx('title')}>{selectedExecution?.name}</div>
              </Tooltip>
            </>
          </div>
          <div className={cx('extra-content-right')}>
            <Button className={cx('action')} onClick={() => toggleTableSelection()}>
              {tableSelectionVisible ? t('common.cancelAction') : t('common.batchAction')}
            </Button>
            <Dropdown
              disabled={getCreatePermission(TestType.Case)}
              dropdownRender={() => menu}
              placement="bottomLeft"
            >
              <Button type="primary">
                {t('modules.panel.testCaseSet.testAddPanel.modelTitle')}
              </Button>
            </Dropdown>
            <Dropdown dropdownRender={() => moreMenu} placement="bottomLeft">
              <Button icon={<CustomMore />} />
            </Dropdown>
            {/* 规划空间测试用例 */}
            <Suspense fallback={null}>
              <RecoilRoot>
                <FilterProvider>
                  <ExportModal
                    iql={iql}
                    exportModalVisible={exportShow}
                    setExportModalVisible={setExportShow}
                    workspace={workspace}
                    appKey={AppKey}
                    appFields={appFields}
                    extraParams={extraParams}
                    exportType="json"
                  />
                </FilterProvider>
              </RecoilRoot>
            </Suspense>
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
      <div data-element-id="test-manager-caseset-table-body" className={cx('box-body')}>
        <TestEntityList
          loading={loading}
          activeType={activeType}
          showType={showType}
          tableSelectionVisible={tableSelectionVisible}
          selectNode={selectNode}
          refreshTreeAndScopeTestCase={refreshTreeAndScopeTestCaseWrapper}
        />
        <TestEntitySelectorModal
          title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
          showDefaultRange
          testType={TestType.Case}
          isPlanForTestSet={true}
          caseSetId={selectedTestCaseSet?.objectId}
          actionRef={testEntitySelectorRef}
          ignoreTestEntityIds={[]}
          afterClose={() => refreshTreeAndScopeTestCaseWrapper?.()}
        />
      </div>
    </div>
  );
};

export default Right;
