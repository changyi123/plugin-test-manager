import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, message, notification } from 'antd';
import _, { set, uniq } from 'lodash';
import { components } from 'proxima-sdk';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { BusinessTable } from '@/components/dynamicComponents';
import { ArrowLeftOutlined, EditIcon } from '@/icons';
import { getStatsTestPlan, getTestEntityByQuery } from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { SystemField, TestFiledKeyMapping, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { goToItemDetailPage } from '@/lib/utils/helper';
import { usePageContext } from '@/pages/approval/hook';

const { ItemIcon } = components.Components.Common;

import { updateItemsWithProcess } from '@/components/business/BatchResult/hooks';
import CreatePermission from '@/components/business/Contianer/CreatePermission';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { mergeIQL } from '@/lib/utils/iql';

import cx from './index.less';

const TestPlanList: React.FC<any> = ({ setApprovalEntry }) => {
  const { t } = useI18n();
  const actionRef = React.useRef<BusinessTableActionType>();
  const { createItemUseModal, testPlanFieldKeys } = useBaseAction();
  const { workspaceKey, selectedTestApproval, setSelectedTestApproval, setSearchParams } =
    usePageContext();
  const [selectors, setSelectors] = useState([{}, {}]);
  const [tableLoading, setTableLoading] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const [ignoreTestEntityIds, setIgnoreTestEntityIds] = useState([]);

  const testEntitySelectorRef = useRef<ModelActionType>();

  const detailSearchRef = useRef(null);

  useEffect(() => {
    if (selectedTestApproval) {
      // 还原筛选器数据
      detailSearchRef.current?.reset();
      setSearchParams([{}, {}]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestApproval]);

  const queryDeps = useMemo(
    () => [workspaceKey, ...(testPlanFieldKeys || []), JSON.stringify(selectors)].join('_'),
    [workspaceKey, testPlanFieldKeys, selectors],
  );

  const tableDataGetter = useCallback(
    async (queryParams, tableFields) => {
      console.log('tableDataGetter', workspaceKey, queryParams, tableFields);
      if (!workspaceKey || !tableFields?.length)
        return {
          list: [],
          total: 0,
        };
      setTableLoading(true);

      const { list, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Approval,
        },
        fields: uniq(
          ['id', SystemField.ItemType, 'reviewMember'].concat(
            SystemFieldKeys,
            tableFields.map(i => i.key).filter(i => i !== 'action'),
          ),
        ),
        selector: selectors,
        notConcatField: true,
        ...queryParams,
      });

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
    const stats = await getStatsTestPlan({
      planIds: list.map(d => d.objectId),
      select: ['caseStatus', 'caseCount'],
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
      title: t('page.approval.columns.approvalTitle'),
      extraProps: {
        onClick: record => setSelectedTestApproval(record),
      },
      render(_, rowData) {
        return (
          <div className={'test-plan-title-box'}>
            {ItemIcon && <ItemIcon className={'icon'} icon={rowData.itemType?.icon}></ItemIcon>}
            <span className={cx('plan-name')}>{rowData.name}</span>
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
          </div>
        );
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
            onClick={async () => {
              const { list } = await getTestEntityByQuery({
                query: {
                  workspaceKey: workspaceKey,
                  type: TestType.Case,
                },
                fields: uniq(
                  ['id', SystemField.ItemType, SystemField.Status].concat(SystemFieldKeys),
                ),
                selector: `测试评审 = '${rowData.id}' and test_manager_type = '${TestType.Case}'`,
                onlySelectId: true,
                limit: 99999,
              });
              setIgnoreTestEntityIds(list);
              const { selectedData } = await testEntitySelectorRef.current.open();
              if (!selectedData.length) {
                return notification.warning({
                  message: t('page.plan.planPageLayout.right.notSelectMessage'),
                });
              }
              await updateItemsWithProcess({
                title: '用例添加中',
                items: selectedData,
                update: {
                  [TestFiledKeyMapping.testApprovals]: {
                    concat: [rowData.id],
                  },
                },
                handleSuccess: () => {
                  notification.success({
                    message: t('page.plan.planPageLayout.right.caseToApprovalSuccessMessage'),
                  });
                  setIgnoreTestEntityIds([]);
                },
                handleFail: error => {
                  message.error(error.message);
                  setIgnoreTestEntityIds([]);
                },
              });
            }}
          >
            {t('page.approval.action.addCase')}
          </a>
        );
      },
    },
  ];

  const handleCreate = async () => {
    await createItemUseModal({
      type: TestType.Approval,
      extraData: {
        isDisableCreateNext: true,
      },
    });
    setTimeout(() => {
      actionRef.current.refresh();
    }, 500);
    notification.success({
      message: t('page.approval.addApprovalSuccess'),
    });
  };

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

  return (
    <div className={cx('test-plan-container')}>
      <div className={cx('plan-header')}>
        <div className={cx('plan-header-body')}>
          <div className={cx('header-left')}>
            <ArrowLeftOutlined
              className={cx('icon')}
              onClick={() => {
                setApprovalEntry(null);
              }}
            />
            <span>{t('page.approval.title')}</span>
          </div>
          <div className={cx('header-right')}>
            <CreatePermission type={TestType.Approval}>
              <Button type="primary" onClick={() => handleCreate()}>
                {t('page.approval.create')}
              </Button>
            </CreatePermission>
          </div>
        </div>
        <div className={cx('plan-header-slot')}>
          <FilterSearch
            enableLocalStorage
            workspaceKey={workspaceKey}
            className={cx('test-manager-filter')}
            ref={detailSearchRef}
            fields={getFilterFields([].concat(SystemFieldKeys, testPlanFieldKeys))}
            extendFields={[]}
            onSearch={setSelectors}
            testType={TestType.Approval}
          />
        </div>
      </div>
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: TestType.Approval,
        }}
        useColumnSetting
        defaultColumnKey={[
          'status',
          'createdAt',
          'createdBy',
          'reviewMember',
          // 'caseCount',
        ]}
        // privateColumnKey={['caseCount']}
        rowKey="objectId"
        columns={columns}
        name={`${workspaceKey}_TestApprovalTable`}
        actionRef={actionRef}
        loading={tableLoading}
        getDataSource={tableDataGetter}
        handleFilterField={handleFilterField}
        onSuccess={onSuccess}
      />
      <TestEntitySelectorModal
        title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
        showDefaultRange
        testType={TestType.Case}
        actionRef={testEntitySelectorRef}
        ignoreTestEntityIds={ignoreTestEntityIds}
      />
    </div>
  );
};

export default TestPlanList;
