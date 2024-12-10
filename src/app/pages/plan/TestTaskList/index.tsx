import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Divider, Dropdown, Menu, message, Space } from 'antd';
import _, { groupBy, isEmpty, uniq } from 'lodash';
import { components } from 'proxima-sdk';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';

import ExportModal from '@/components/business/TestExecution/ExportModal';
import ImportModal from '@/components/business/TestExecution/ImportModal';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { BusinessTable } from '@/components/dynamicComponents';
import { CustomMore, CustomPage } from '@/icons';
import { EditIcon } from '@/icons';
import {
  getLinkedTestEntityByQuery,
  getStatsTestExecution,
  getTestEntityByQuery,
} from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import {
  SystemField,
  TestExecutionModel,
  TestFiledKeyMapping,
  TestLinkType,
  TestPlanModel,
  TestType,
} from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { goToItemDetailPage } from '@/lib/utils/helper';
import { usePageContext } from '@/pages/plan/hook';

import { StatusProgress } from '../../../components/business/Status';

const { ItemIcon } = components.Components.Common;
import CreatePermission from '@/components/business/Contianer/CreatePermission';
import TestEntitySelectorModal from '@/components/business/TestEntitySelectorModal';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { getAppEnv } from '@/lib/appEnv';
import Parse from '@/lib/parse';
import { selectorToIql } from '@/lib/utils/iql';
import { downloadImportExcelFile } from '@/pages/repository/RepoDropDown/export';
import { Version } from '@/services/models';

import CreateReportModel, { ActionType } from '../../report/Model/createReportV2Model';
import { useGetExecutionIds } from '../PlanPageLayout/hooks';
import cx from './index.less';

const handleSelector = (selector, key) => {
  if (isEmpty(selector)) return null;
  const selectors = {} as Record<string, any>;
  if (selector) {
    // 处理测试用例库筛选字段
    selectors[key] = {
      ...selector,
      component: 'Dropdown',
      fieldName: 'id',
    };
  }
  return {
    ...selectors,
  };
};

const getReportOverviewData = selectors => {
  const getSelectorDataGetters = type => {
    switch (type) {
      case TestPlanModel:
        return selector => {
          if (!selector?.value) return null;
          return {
            testPlan: selector?.value?.map(i => i.value).filter(Boolean),
          };
        };
      case TestExecutionModel:
        return selector => {
          if (!selector?.value) return null;
          return {
            testExecution: selector?.value?.map(i => i.value).filter(Boolean),
          };
        };
      default:
        return selector => {
          if (!selector?.value) return null;
          return {
            [selector.key]: selector?.value?.map(i => i?.value ?? i?.id).filter(Boolean),
          };
        };
    }
  };

  return Object.values(selectors ?? {}).reduce((res: any, selector: any) => {
    return {
      ...res,
      ...(getSelectorDataGetters(selector.key)(selector) ?? {}),
    };
  }, {});
};

const TestTaskList: React.FC<any> = ({
  listRef,
  setSelectedExecution,
  createTestExecution,
  selectorModalRef,
  addExistedTestExecution,
}) => {
  const { t } = useI18n();
  const actionRef = React.useRef<BusinessTableActionType>();

  const { createItemUseModal, testExecutionFieldKeys } = useBaseAction();
  const { workspaceKey, selectedTestPlan, setPlanId } = usePageContext();

  const [selectors, setSelectors] = useState([{}, {}]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableSelectionVisible, setTableSelectionVisible] = useState(false);
  const [hasRowSelected, setHasRowSelected] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const modalRef = useRef<ActionType>();

  const detailSearchRef = useRef(null);
  const reportSelect = useRef();

  const { workspace, config } = useTestConfig();

  const defaultNameConfig = getAppEnv('CREATE_EXECUTION_DEFAULT_NAME_CONFIG');
  const enable = defaultNameConfig?.enable;

  const queryDeps = useMemo(
    () =>
      [
        workspaceKey,
        ...(testExecutionFieldKeys || []),
        JSON.stringify(selectors),
        selectedTestPlan?.objectId,
      ].join('_'),
    [workspaceKey, testExecutionFieldKeys, selectors, selectedTestPlan?.objectId],
  );

  React.useImperativeHandle(listRef, () => ({
    refresh: () => {
      actionRef.current?.refresh(); // 刷新表格
    },
  }));

  // 获取筛选后的测试计划关联的测试用例 ID
  const { data: allExecutionIds } = useGetExecutionIds({
    workspaceKey,
    type: 'TestPlan',
    selectors,
  });

  const tableDataGetter = useCallback(
    async (queryParams, tableFields) => {
      if (!workspaceKey || !tableFields?.length)
        return {
          list: [],
          total: 0,
        };
      setTableLoading(true);
      let res = { list: [], total: 0 };

      if (selectedTestPlan?.objectId) {
        res = await getLinkedTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
          },
          fields: uniq(
            ['id'].concat(
              SystemFieldKeys,
              tableFields.map(i => i.key).filter(i => i !== 'action'),
            ),
          ),
          notConcatField: true,
          ...queryParams,
          selector: selectors,
          linkType: TestLinkType.ExecutionLinkPlan,
          sourceIds: [selectedTestPlan.objectId],
          destinationType: TestType.Execution,
        });
      } else {
        res = await getTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
            type: TestType.Execution,
          },
          fields: uniq(
            ['id', SystemField.ItemType, TestFiledKeyMapping.linkItems].concat(
              SystemFieldKeys,
              tableFields.map(i => i.key).filter(i => i !== 'action'),
            ),
          ),
          selector: selectors,
          notConcatField: true,
          ...queryParams,
        });
      }

      const { list, total } = res;

      setTableLoading(false);

      return {
        list:
          list.map(i => ({
            ...i,
            status: i.workflowStatus,
          })) ?? [],
        total: total ?? 0,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryDeps],
  );

  const onSuccess = useMemoizedFn(async (data, mutate) => {
    const { list = [], total } = data ?? {};
    if (!list.length) return;
    const stats = await getStatsTestExecution({
      executionIds: list.map(d => d.objectId),
      select: ['runStatus', 'runCount'],
    });

    mutate({
      total,
      list: _.chain(list)
        .map(testPlan => {
          return {
            ...testPlan,
            ...stats?.[testPlan.objectId],
            status: testPlan.status,
          };
        })
        .value(),
    });
  });

  const { data: currentFields } = useRequest(
    async () => {
      return await getCurrentUserSetting({
        workspaceKey,
        user: currentUser as unknown as Parse.Pointer,
      });
    },
    {
      refreshDeps: [workspaceKey, currentUser],
    },
  );

  const handleView = data => {
    goToItemDetailPage({
      workspaceKey: data.workspace?.key,
      itemKey: data.key,
    });
  };

  const columns: any[] = [
    {
      width: 300,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: t('components.business.testPlanList.taskName'),
      extraProps: {
        onClick: rowData => {
          rowData?.linkItems?.[0] && setPlanId(rowData.linkItems[0]);
          setSelectedExecution(rowData);
        },
      },
      render(_, rowData) {
        return (
          <div className={'test-plan-title-box'}>
            {ItemIcon && <ItemIcon className={'icon'} icon={rowData.itemType?.icon}></ItemIcon>}
            <span className={cx('plan-name')}>{rowData.name}</span>
            {!tableSelectionVisible && (
              <span
                className={cx('plan-table-title-menu')}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <EditIcon
                  className={'icon'}
                  onClick={() => {
                    handleView(rowData);
                  }}
                />
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'caseStatus',
      title: t('components.business.testPlanList.caseStatus'),
      width: 240,
      render(_, rowData) {
        const passCount = rowData.runStatus?.PASSED ?? 0;
        const total =
          Object.values(rowData.runStatus ?? {})?.reduce((prev: number, cur: number) => {
            prev = prev + cur;
            return prev;
          }, 0) || 1;
        const rate = passCount ? passCount / (total as number) : 0;

        return (
          <div className={cx('table-rate')}>
            <StatusProgress className={cx('status')} hasSummary status={rowData.runStatus} />
            <span className={cx('rate')}>{`${Math.floor(rate * 100)}%`}</span>
          </div>
        );
      },
    },
    {
      key: 'runCount',
      title: t('components.business.testPlanList.planCaseCount'),
      align: 'right',
      width: 100,
      render(_, rowData) {
        return <span>{rowData?.runCount}</span>;
      },
    },
    {
      key: 'action',
      title: '',
      isSystem: true,
      fixed: 'right' as any,
      width: 40,
      render(_) {
        return <span></span>;
      },
    },
  ];

  const handleFilterField = useMemoizedFn(async ({ testType, fieldKeys }) => {
    await saveUserSetting({
      workspaceKey,
      testType,
      filterFields: {
        ...(currentFields?.filterFields ?? {}),
        [testType]: fieldKeys,
      },
    });
    await actionRef.current.refresh();
  });

  const [exportShow, setExportShow] = useState(false);
  const [importShow, setImportShow] = useState(false);

  const openTheImportWindow = () => {
    setImportShow(true);
  };
  const menuClick = useCallback(
    async e => {
      const key = e.key;
      if (key === 'exportTask') {
        // do something
        setExportShow(true);
      }
      if (key === 'importTask') {
        openTheImportWindow();
      }
      if (key === 'importTaskTemplate') {
        downloadImportExcelFile({ t, fieldKeys: [] });
      }
    },
    [openTheImportWindow, t],
  );
  const menu = (
    <Menu onClick={e => menuClick(e)}>
      <Menu.Item key="exportTask">{t('page.repository.repoDropDown.MenuItem.8')}</Menu.Item>
      <Menu.Item key="importTask">{t('executionTaskImport.entry')}</Menu.Item>
      <Menu.Item key="importTaskTemplate">{t('executionTaskImport.download')}</Menu.Item>
    </Menu>
  );

  const toggleSelection = useCallback(
    (visible?: boolean) => {
      visible = typeof visible === 'boolean' ? visible : !tableSelectionVisible;
      setTableSelectionVisible(visible);
      actionRef.current.resetSelectedRowKeys();
      actionRef.current.toggleSelection(visible);
    },
    [tableSelectionVisible],
  );

  const createReport = useCallback(
    async (params?: unknown) => {
      const res: any = await modalRef.current.open(params);
      if (!res.template?.objectId) return;
      reportSelect.current = { ...res, currentStep: '2', init: true };

      const iqlMap = Object.entries(res.selectors ?? {}).reduce((prev, [key, value]: any[]) => {
        prev[value.key] = selectorToIql(
          [TestPlanModel, TestExecutionModel].includes(key)
            ? handleSelector(value, key)
            : { key: value },
        );
        return prev;
      }, {});

      await createItemUseModal({
        type: TestType.Report,
        extraData: {
          fields: {
            reportOverviewData: getReportOverviewData(res.selectors),
            reportTemplate: res.template.objectId,
          },
          defectsMapping: config?.defectsMapping,
          iqlMap,
          templateId: res.template.objectId,
          isCustomCreateItem: true,
          isDisableCreateNext: true,
          // isShowPrevButton: true,
          modalProps: {
            title: t('page.reportTemplateCreator.createReportModelTitle'),
            footer: {
              cancel: {
                name: t('common.prevStep'),
              },
            },
          },
        },
      });
      toggleSelection(false);
    },
    [createItemUseModal, t, config?.defectsMapping, toggleSelection],
  );

  // 全部用例批量操作
  const selectionActionNodes = React.useMemo(() => {
    const handleCreateReport = async () => {
      const selectIds = actionRef.current.selectedRowKeys;

      // 获取空间下的全局测试执行任务ids
      const { list: executionData } = await getTestEntityByQuery({
        query: {
          workspaceKey,
          type: TestType.Execution,
        },
        selector: `id in ${JSON.stringify(selectIds)}`,
        fields: ['version', 'id', 'name', 'status'],
        limit: selectIds.length,
      });

      const flag = executionData.some(
        data => !['已关闭', '已取消'].includes(data.workflowStatus?.name),
      );

      if (flag) {
        return message.error('所选测试执行任务状态未关闭，无法创建测试报告');
      }

      const groupExecutionData = groupBy(executionData, item => {
        const versionData = item.values?.version;
        if (!versionData?.length) return '';
        return versionData
          .map(d => d?.objectId || d)
          .sort()
          .join('_');
      });

      const versionList = Object.keys(groupExecutionData);

      if (versionList.length > 1) {
        return message.error('所选测试执行任务属于不同版本，无法创建测试报告');
      }

      const versionId = versionList[0];

      let versionData;

      if (versionId) {
        versionData = await new Parse.Query(Version)
          .equalTo('objectId', versionId)
          .include('workspace')
          .first({ json: true });
      }

      // 版本字段的objectId是固定的（初始化数据）
      const versionFieldId = '6ImwkUAtSj';

      const extraSelectors = {
        [versionFieldId]: {
          component: 'Version',
          expression: 'Dropdown_Contain',
          key: 'version',
          fieldId: '6ImwkUAtSj',
          fieldName: '版本',
          value: versionData
            ? [
                {
                  value: versionId,
                  label: versionData.name,
                  name: versionData.name,
                  workspace: versionData.workspace,
                },
              ]
            : [],
        },
        test_manager_Execution: {
          component: undefined,
          expression: 'test_manager_Plan_Contain',
          fieldId: 'test_manager_Execution',
          fieldName: '测试执行任务',
          isExtend: true,
          key: 'test_manager_Execution',
          value: executionData.map(data => ({
            id: data.objectId,
            label: data.name,
            name: data.name,
            toolTip: data.name,
            value: data.objectId,
          })),
        },
      };

      createReport({ selectors: extraSelectors, extraSelectors });
    };
    return [
      <span
        className={cx('action')}
        key="createReport"
        onClick={() => hasRowSelected && handleCreateReport()}
      >
        <CustomPage /> {t('modules.panel.testPlan.testExecutionPanel.createReport')}
      </span>,
    ];
  }, [hasRowSelected, t, createReport, workspaceKey]);

  return (
    <div className={cx('test-plan-container')}>
      <div className={cx('plan-header')}>
        <div className={cx('plan-header-body')}>
          <Space className={cx('header-left')}>
            {t('common.testExecution')}
            <Divider type="vertical" />
            <TestPlanSelector hiddenCheckAll />
          </Space>

          <Space className={cx('header-right')}>
            {enable && (
              <Button onClick={() => toggleSelection()}>
                {tableSelectionVisible ? t('common.cancelAction') : t('common.batchAction')}
              </Button>
            )}

            {selectedTestPlan?.objectId ? (
              <>
                <CreatePermission type={TestType.Execution}>
                  <Button
                    type="primary"
                    onClick={async () => {
                      createTestExecution();
                    }}
                  >
                    {t('common.createTestExecution')}
                  </Button>
                </CreatePermission>
                <CreatePermission type={TestType.Execution}>
                  <Button
                    type="primary"
                    onClick={async () => {
                      addExistedTestExecution();
                    }}
                  >
                    {t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
                  </Button>
                </CreatePermission>
              </>
            ) : null}
            <Dropdown dropdownRender={() => menu} placement="bottomLeft">
              <Button icon={<CustomMore />} />
            </Dropdown>
            {exportShow && (
              <ExportModal
                onCancel={() => {
                  setExportShow(false);
                }}
              />
            )}
            {importShow && (
              <ImportModal
                onCancel={() => {
                  setImportShow(false);
                }}
              />
            )}
          </Space>
        </div>
        <div className={cx('plan-header-slot')}>
          <FilterSearch
            enableLocalStorage
            workspaceKey={workspaceKey}
            className={cx('test-manager-filter')}
            ref={detailSearchRef}
            fields={getFilterFields([].concat(SystemFieldKeys, testExecutionFieldKeys))}
            extendFields={[]}
            onSearch={setSelectors}
            testType={TestType.Execution}
          />
        </div>
      </div>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title={t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
        ignoreTestEntityIds={[]}
        tableFieldsKeys={testExecutionFieldKeys}
        width={800}
      />
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: TestType.Execution,
        }}
        useColumnSetting
        defaultColumnKey={[
          'status',
          'caseCount',
          'assignee',
          'createdAt',
          'createdBy',
          'caseStatus',
        ]}
        privateColumnKey={['caseCount', 'caseStatus']}
        rowKey="objectId"
        columns={columns}
        name={`${workspaceKey}_TestTaskTable`}
        actionRef={actionRef}
        loading={tableLoading}
        getDataSource={tableDataGetter}
        handleFilterField={handleFilterField}
        onSuccess={onSuccess}
        onSelectionCancel={() => toggleSelection(false)}
        {...(enable
          ? {
              allSelectableRowKeys: allExecutionIds,
              selectionActionNodes: selectionActionNodes,
              onHasRowSelected: setHasRowSelected,
            }
          : {})}
      />
      <CreateReportModel actionRef={modalRef} workspace={workspace}></CreateReportModel>
    </div>
  );
};

export default TestTaskList;
