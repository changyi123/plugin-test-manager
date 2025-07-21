/* eslint-disable react-hooks/exhaustive-deps */
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { useMemoizedFn } from 'ahooks';
import { useRequest } from 'ahooks';
import { message, notification } from 'antd';
import { TestFiledKeyMapping, TestType } from 'common/constant';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';

import { updateItemsWithProcess } from '@/components/business/BatchResult/hooks';
import RenderRepository from '@/components/business/RenderRepository';
import UserCell from '@/components/business/UserCell';
import { BusinessTable } from '@/components/common/BusinessTable';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import Field from '@/components/common/Field';
import { getTestEntityByQuery, handleSelector } from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import { selectorToIql } from '@/lib/utils/iql';
import { getRepositoryQuery } from '@/lib/utils/tree';

import { usePageContext } from '../hook';
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
  activeType,
  selectNode,
  refreshTreeAndScopeTestCase,
  tableSelectionVisible,
}) => {
  const {
    workspaceKey,
    selectors,
    selectedTestCaseSet,
    registerRefreshMethod,
    tableSelectionToggleEvent,
    mutateTestTableList,
  } = usePageContext();
  const { testCaseFieldKeys } = useBaseAction();
  const { t } = useI18n();

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

  const { data: allCanSelectTestIds, refresh } = useRequest(
    async () => {
      const filterSelectors = selectorToIql(handleSelector(selectors));
      const { list } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          repository: selectNode ? getRepositoryQuery(selectNode)?.repository : '',
        },
        onlySelectId: true,
        limit: 99999,
        selector: `${filterSelectors ? `${filterSelectors} and ` : ''}'测试用例集' in ['${
          selectedTestCaseSet.objectId
        }']`,
      });
      return list;
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [selectNode, selectors, activeType, selectedTestCaseSet.objectId],
    },
  );
  // 获取全部用例 getter
  const testCaseTableDataGetter = useFnHookTriggerFn(
    useCallback(
      async queryParams => {
        console.info('queryParams', queryParams);
        const caseFieldKeys = [].concat(SystemFieldKeys, testCaseFieldKeys ?? []);
        const filterSelectors = selectorToIql(handleSelector(selectors));
        const { list, total } = await getTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
            type: TestType.Case,
            repository: selectNode ? getRepositoryQuery(selectNode)?.repository : '',
          },
          fields: caseFieldKeys.concat([TestFiledKeyMapping.testSet]),
          ...queryParams,
          selector: `${filterSelectors ? `${filterSelectors} and ` : ''}'测试用例集' in ['${
            selectedTestCaseSet.objectId
          }']`,
        });
        //  需要把testSet字段拍平处理，这样少调用一个接口
        return {
          list: list,
          total: total,
        };
      },
      [selectNode, selectors, activeType, selectedTestCaseSet.objectId, testCaseFieldKeys],
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
    if (!isEmpty(systemSelectors)) {
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

  const removeTestCaseFromSet = useMemoizedFn(async selectedCaseIds => {
    if (!Array.isArray(selectedCaseIds) || selectedCaseIds?.length === 0) {
      return;
    }
    await updateItemsWithProcess({
      title: '用例移除中',
      items: selectedCaseIds,
      fields: {
        values: {},
      },
      update: {
        [TestFiledKeyMapping.testSet]: {
          remove: selectedTestCaseSet.objectId,
        },
      },
      handleSuccess: () => {
        message.success(t('page.testset.testEntityList.removeCaseFromSetSuccessMsg'));
        setTimeout(() => {
          addAndDeleteRefresh();
          mutateTestTableList.emit('refreshTable');
          refresh();
        }, 500);
      },
      handleFail: error => {
        // setLoading(false);
        message.error(error.message);
      },
    });
  });

  //  测试计划--全部用例表头
  const allTestColumns = React.useMemo(() => {
    return [
      {
        width: 300,
        key: 'title',
        fixed: true,
        isSystem: true,
        title: t('common.title'),
        // sorter: {
        //   compare: (a, b) => {
        //     return a.name.length - b.name.length;
        //   },
        // },
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
      // 测试执行状态
      // {
      //   key: 'caseLatestStatus',
      //   title: t('page.plan.testEntityList.runStatus'),
      //   sorter: {
      //     compare: (a, b) => {
      //       return (a.caseLatestStatus || '').localeCompare(b.caseLatestStatus || '');
      //     },
      //   },
      //   width: 200,
      //   render(_, rowData) {
      //     return (
      //       <StatusBadge readonly status={rowData.caseLatestStatus} className={cx('cell-min')} />
      //     );
      //   },
      // },
      // 最新执行人
      {
        key: 'caseLatestExecutor',
        title: t('page.plan.testEntityList.executor'),
        sorter: {
          compare: (a, b) => {
            return (a.caseLatestExecutor?.nickname || '').localeCompare(
              b.caseLatestExecutor?.nickname || '',
            );
          },
        },
        width: 200,
        render(_, rowData) {
          return <Field.User userInfo={rowData?.caseLatestExecutor} />;
        },
      },
      // 引用次数
      {
        key: 'runCount',
        title: <span>{t('page.plan.testEntityList.runCount')}</span>,
        sorter: {
          compare: (a, b) => {
            return a.runCount - b.runCount;
          },
        },
        width: 140,
        render(_, rowData) {
          return rowData.runCount ?? 0;
        },
      },
      {
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
                        <span>{t('page.testset.testEntityList.removeCaseTips')}</span>
                      </>
                    ),
                  },
                  () => {
                    removeTestCaseFromSet([rowData?.objectId]);
                  },
                );
              }}
            >
              {t('common.remove')}
            </a>
          );
        },
      },
    ];
  }, [removeTestCaseFromSet, t]);

  // 全部用例批量操作
  const selectionActionNodes = React.useMemo(() => {
    const handleDelete = () => {
      if (hasRowSelected) {
        removeTestCaseFromSet(actionRef.current.selectedRowKeys);
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
  }, [userData, hasRowSelected, t, workspaceKey, addAndDeleteRefresh]);

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
        defaultColumnKey={['caseLatestStatus', 'key', 'repositoryGroup', 'createdBy', 'createdAt']}
        privateColumnKey={['repositoryGroup', 'caseLatestStatus']}
        rowKey="objectId"
        columns={allTestColumns}
        name={`${workspaceKey}_AllTestEntity`}
        actionRef={actionRef}
        loading={loading}
        getDataSource={testCaseTableDataGetter}
        onHasRowSelected={setHasRowSelected}
        allSelectableRowKeys={allCanSelectTestIds}
        selectionActionNodes={selectionActionNodes}
        onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
        handleFilterField={handleFilterField}
      />
    </div>
  );
};
export default TestEntityList;
