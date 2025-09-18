/* eslint-disable react-hooks/exhaustive-deps */
import { DeleteOutlined, FlagOutlined, UserOutlined } from '@ant-design/icons';
import { useListener } from '@projectproxima/proxima-sdk-js';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useRequest } from 'ahooks';
import { message, notification } from 'antd';
import { SystemField, TestFiledKeyMapping, TestType } from 'common/constant';
import { isEmpty, uniq } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';

import {
  removeCaseFromPlanWithProcess,
  updateItemsWithProcess,
} from '@/components/business/BatchResult/hooks';
import RenderRepository from '@/components/business/RenderRepository';
import { StatusBadge } from '@/components/business/Status';
import UserCell from '@/components/business/UserCell';
import { BusinessTable } from '@/components/common/BusinessTable';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { useStepAfterUpdateItemList } from '@/components/common/BusinessTable/hook';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import { getTestEntityByQuery, handleSelector } from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { featureFlags, SupportFeatureFlags } from '@/lib/appEnv';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import { mergeIQL, selectorToIql } from '@/lib/utils/iql';
import { getRepositoryQuery } from '@/lib/utils/tree';
import TableCellTestDetailForm from '@/modules/beforeCreateOrUpdateModal/TableCellTestDetailForm';
import { FormFieldKey } from '@/pages/config/ApprovalConfig';

import { usePageContext } from '../hook';
import { useGetFilterApprovalLinkCaseIds } from '../PlanPageLayout/hooks';
import cx from './index.less';

interface TestEntityListProps {
  loading: boolean;
  activeType: string;
  showType?: string;
  refreshPlanData?: () => void;
  tableSelectionVisible?: boolean;
  selectNode?: Record<string, any>;
  refreshTreeAndScopeTestCase?: () => void;
}

const useFnHookTriggerFn = (fn, before, after) => {
  return React.useCallback(
    async (...args) => {
      let res;
      try {
        before?.();
        res = await fn?.(...args);
      } catch (err) {
        console.error(err);
      }
      after?.();
      return res;
    },
    [fn],
  );
};

const TestEntityList: React.FC<TestEntityListProps> = ({
  loading: loadingFromParentElement,
  showType,
  activeType,
  selectNode,
  refreshTreeAndScopeTestCase,
  tableSelectionVisible,
}) => {
  const {
    workspaceKey,
    selectors,
    selectedTestApproval,
    registerRefreshMethod,
    approvalLinkCaseIds: scopedTestCaseIds,
    tableSelectionToggleEvent,
    mutateTestTableList,
  } = usePageContext();
  const { t } = useI18n();
  const enableRepositoryTableStep = featureFlags(SupportFeatureFlags.ENABLE_REPOSITORY_TABLE_STEP);
  const proxima = createProximaSdk();
  const { config } = useTestConfig();
  const { testCaseFieldKeys, globalTestConfig, createItemUseModal } = useBaseAction();

  const DISABLED_STATUSES =
    globalTestConfig?.approvalConfig?.[FormFieldKey.actionDisabledItemStatuses]; // || window.QiankunProps?.context?.env?.TEST_APPROVAL_DISABLED_STATUS;

  console.log('selectedTestApproval', selectedTestApproval, config, globalTestConfig);

  const actionRef = React.useRef<BusinessTableActionType>();
  const userData = useUserCellUserDataProp(workspaceKey);
  const { data: currentUser } = useCurrentUser();

  const [tableLoading, setTableLoading] = useState(false);
  const [hasRowSelected, setHasRowSelected] = useState(false);
  const loading = loadingFromParentElement || tableLoading;

  React.useEffect(() => {
    registerRefreshMethod({
      detailTable: actionRef.current?.refresh,
    });
  }, [registerRefreshMethod]);

  // 事项数据更新后刷新列表
  useListener('updateItemList', props => {
    if (props?.type === 'create') return;
    if (props?.type === 'delete') {
      refreshTreeAndScopeTestCase?.();
    }
    setTimeout(() => {
      actionRef.current.refresh();
    }, 400);
  });

  useListener('updateTestRunStatus', () => {
    refreshTreeAndScopeTestCase?.();
  });

  // 修改弹窗的步骤后，更新table的数据
  const { enableCacheEpandedRowKeys } = useStepAfterUpdateItemList({
    selectNodeKey: selectNode?.key,
    refresh: () => {
      actionRef.current.refresh();
    },
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

  // 获取筛选后的测试计划关联的测试用例 ID
  const { data: allApprovalRowKeys } = useGetFilterApprovalLinkCaseIds({
    workspaceKey,
    type: 'TestApproval',
    id: scopedTestCaseIds,
    selectNode,
    selectors,
  });

  // 获取全部用例 getter
  const testApprovalTableDataGetter = useFnHookTriggerFn(
    useCallback(
      async (queryParams, tableFields) => {
        console.log('testApprovalTableDataGetter', queryParams, selectedTestApproval, selectNode);
        const query: Record<string, string> = {
          workspaceKey: workspaceKey,
          type: TestType.Case,
        };
        if (selectNode && selectNode?.key !== 'root') {
          query.repository = getRepositoryQuery(selectNode, showType)?.repository;
        }
        const { list, total } = await getTestEntityByQuery({
          query,
          fields: uniq(
            ['id', SystemField.ItemType, SystemField.Status].concat(
              SystemFieldKeys,
              testCaseFieldKeys,
              tableFields.map(i => i.key).filter(i => i !== 'action'),
            ),
          ),
          selector: mergeIQL(
            selectorToIql(handleSelector(selectors)),
            `测试评审 = '${selectedTestApproval?.objectId}'`,
          ),
          ...queryParams,
        });
        return {
          list:
            list.map(i => ({
              ...i,
              status: i.workflowStatus,
            })) ?? [],
          total,
        };
      },
      [
        selectNode,
        workspaceKey,
        activeType,
        testCaseFieldKeys,
        JSON.stringify(selectors),
        selectedTestApproval?.objectId,
        showType,
      ],
    ),
    () => {
      setTableLoading(true);
    },
    () => {
      setTableLoading(false);
    },
  );

  useEffect(() => {
    const [systemSelectors] = selectors ?? [];
    if (!isEmpty(systemSelectors) && activeType !== 'TestApproval') {
      // scopedTestDetailRefresh();
      const isEmptyValue = Object.values(systemSelectors)
        .map(d => d?.value)
        .filter(Boolean);
      // 筛选器有 tag 值为空时取消 loading
      if (isEmptyValue.length) {
        setTableLoading(false);
      }
    }
  }, [selectors, activeType]);

  const addAndDeleteRefresh = useCallback(async () => {
    // 重置 RowKeys
    actionRef.current.resetSelectedRowKeys();
    // 刷新左侧树，表格依赖刷新，刷新获取全部id
    setTimeout(() => {
      refreshTreeAndScopeTestCase();
    }, 500);
  }, [refreshTreeAndScopeTestCase]);

  const removeTestRelation = React.useCallback(
    async (testCaseItemId, testDetails) => {
      if (!Array.isArray(testDetails)) return;

      await updateItemsWithProcess({
        title: '用例移除中',
        items: [testCaseItemId],
        update: {
          [TestFiledKeyMapping.testApprovals]: {
            remove: selectedTestApproval.objectId,
          },
        },
        handleSuccess: async () => {
          await addAndDeleteRefresh();
          notification.success({
            message: `${testDetails.length} ${t('page.plan.testEntityList.removeCaseMessage')}`,
          });
          proxima.execute('refreshSelectedNode');
        },
        handleFail: error => {
          message.error(error.message);
        },
      });
    },
    [addAndDeleteRefresh, t],
  );

  //  测试计划--全部用例表头
  const allTestColumns = React.useMemo(() => {
    const allColumns: Record<string, any>[] = [
      {
        width: 400,
        key: 'title',
        fixed: true,
        isSystem: true,
        title: t('common.title'),
        sorter: {
          compare: (a, b) => {
            return a.name.length - b.name.length;
          },
        },
        className: 'test-case-title',
        extraProps: {
          onClick: record => {
            openItemViewScreen(record?.objectId);
          },
        },
        shouldCellUpdate: (record, prevRecord) => {
          return (
            record.repository?.objectId !== prevRecord.repository?.objectId ||
            record.name !== prevRecord.name
          );
        },
        render(_, rowData) {
          const itemData = rowData ?? {};
          console.log('rowData', rowData);
          return (
            <span data-drawer-handle-target style={{ cursor: 'pointer' }}>
              {itemData.name}
            </span>
          );
        },
      },
      // 所属模块
      {
        key: 'repositoryGroup',
        title: t('page.plan.testEntityList.repositoryGroup'),
        sorter: {
          compare: (a, b) => {
            return +new Date(a.createdAt) - +new Date(b.createdAt);
          },
        },
        width: 200,
        render(_, rowData) {
          return <RenderRepository repository={rowData?.repository} />;
        },
      },
    ];

    console.log(
      'QiankunProps.env',
      window.QiankunProps.context.env,
      DISABLED_STATUSES,
      (selectedTestApproval as any)?.status?.objectId,
      !(
        DISABLED_STATUSES &&
        DISABLED_STATUSES.includes((selectedTestApproval as any)?.status?.objectId)
      ),
    );
    if (
      !(
        DISABLED_STATUSES &&
        DISABLED_STATUSES.includes((selectedTestApproval as any)?.status?.objectId)
      )
    ) {
      allColumns.push({
        key: 'action',
        isSystem: true,
        title: t('common.action'),
        width: 90,
        fixed: 'right' as any,
        render(_, rowData) {
          return (
            <a
              onClick={() => {
                actionConfirm(
                  {
                    title: t('common.tip'),
                    okText: t('common.okText'),
                    cancelText: t('common.cancel'),
                    content: (
                      <>
                        <span>
                          {rowData.runCount
                            ? t('page.plan.testEntityList.removeCaseTips2')
                            : t('page.plan.testEntityList.removeCaseTips')}
                        </span>
                      </>
                    ),
                  },
                  () => {
                    removeTestRelation(rowData.id, [rowData]);
                  },
                );
              }}
              style={{ color: 'red' }}
            >
              {t('common.remove')}
            </a>
          );
        },
      });
    }

    return allColumns;
  }, [removeTestRelation, t]);

  // 全部用例批量操作
  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      if (hasRowSelected) {
        actionConfirm(
          {
            title: t('common.tip'),
            okText: t('common.okText'),
            cancelText: t('common.cancel'),
            content: (
              <>
                <span>{t('page.plan.testEntityList.removeCaseTips2')}</span>
              </>
            ),
          },
          async () => {
            // @TODO update V2 remove case from plan
            setTableLoading(true);
            await removeCaseFromPlanWithProcess({
              caseIds: actionRef.current.selectedRowKeys ?? [],
              planId: selectedTestApproval?.objectId,
              handleSuccess: () => {
                setTimeout(() => {
                  addAndDeleteRefresh();
                  actionRef.current?.refresh();
                }, 500);
                proxima.execute('refreshSelectedNode');
              },
              handleFail: error => {
                setTableLoading(false);
                message.error(error.message);
              },
            });
          },
        );
      }
    };

    // 更新负责人
    const handleAssigneeChange = async assignee => {
      const testIds = actionRef.current.selectedRowKeys;
      setTableLoading(true);
      await updateItemsWithProcess({
        items: testIds,
        fields: {
          values: { assignee },
        },
        handleSuccess: () => {
          actionRef.current.refresh();

          notification.success({
            message: `${testIds.length} ${t('page.plan.testEntityList.updateAssigneeTips')}`,
          });
        },
        handleFail: error => {
          message.error(error.message);
          actionRef.current.refresh();
        },
      });
    };

    return [
      <UserCell
        value={[]}
        key="assignee"
        mode="multiple"
        userData={userData}
        readonly={!hasRowSelected}
        onChange={handleAssigneeChange}
        emptyChild={
          <span className={cx('user-field')}>
            <UserOutlined /> {t('page.plan.testEntityList.assigneeSetting')}
          </span>
        }
      />,

      <span className={cx('danger')} key="delete" onClick={() => hasRowSelected && handleDelete()}>
        <DeleteOutlined /> {t('common.remove')}
      </span>,
    ];
  }, [
    userData,
    hasRowSelected,
    t,
    workspaceKey,
    addAndDeleteRefresh,
    selectedTestApproval?.objectId,
  ]);

  tableSelectionToggleEvent.useSubscription(visible => {
    actionRef.current.toggleSelection(visible);
    actionRef.current.resetSelectedRowKeys();
  });

  const handleFilterField = useCallback(
    async ({ testType, fieldKeys }) => {
      await saveUserSetting({
        workspaceKey,
        testType,
        filterFields: {
          ...(currentFields?.filterFields ?? {}),
          [testType]: fieldKeys,
        },
      });
    },
    [currentUser, workspaceKey, currentFields],
  );

  mutateTestTableList.useSubscription(key => {
    key === 'refreshTable' && actionRef.current.refresh();
  });

  return (
    <div className={cx('test-entity-list-box')}>
      <BusinessTable
        className={cx(`${tableSelectionVisible ? 'batch-action' : ''}`)}
        titleCellOption={{
          workspaceKey,
          testType: TestType.Case,
          restoreWithDefaultColumnKey: true,
        }}
        useColumnSetting
        defaultColumnKey={['status', 'key', 'repositoryGroup', 'createdBy', 'createdAt']}
        privateColumnKey={['repositoryGroup', 'status']}
        rowKey="objectId"
        columns={allTestColumns}
        name={`${workspaceKey}_AllTestEntity`}
        actionRef={actionRef}
        loading={loading}
        getDataSource={testApprovalTableDataGetter}
        onHasRowSelected={setHasRowSelected}
        allSelectableRowKeys={allApprovalRowKeys}
        selectionActionNodes={selectionActionNodes}
        onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
        handleFilterField={handleFilterField}
        enableCacheEpandedRowKeys={enableCacheEpandedRowKeys}
        expandable={
          enableRepositoryTableStep && {
            expandedRowClassName: () => {
              return cx('expandedRowClassName');
            },
            expandedRowRender: record => {
              return (
                <div className={cx('form')}>
                  <TableCellTestDetailForm
                    values={record?.detail ?? {}}
                    objectId={record?.objectId}
                  />
                </div>
              );
            },
          }
        }
      />
    </div>
  );
};

export default TestEntityList;
