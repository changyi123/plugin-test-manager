import { useMemoizedFn, useRequest } from 'ahooks';
import _, { uniq } from 'lodash';
import { components } from 'proxima-sdk';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { BusinessTable } from '@/components/dynamicComponents';
import { EditIcon } from '@/icons';
import {
  getLinkedTestEntityByQuery,
  getStatsTestExecution,
  getTestEntityByQuery,
} from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { SystemField, TestFiledKeyMapping, TestLinkType, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { goToItemDetailPage } from '@/lib/utils/helper';
import { usePageContext } from '@/pages/plan/hook';

import { StatusProgress } from '../../../components/business/Status';

const { ItemIcon } = components.Components.Common;

import { Divider, Empty, Space } from 'antd';

import TestPlanSelector from '@/components/business/TestPlanSelector';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';

import NoData from '../PlanPageLayout/NoData';
import cx from './index.less';

const TestTaskList: React.FC<any> = ({
  listRef,
  setSelectedExecution,
  createTestExecution,
  selectorModalRef,
  addExistedTestExecution,
}) => {
  const { t } = useI18n();
  const actionRef = React.useRef<BusinessTableActionType>();
  const { testExecutionFieldKeys } = useBaseAction();
  const { workspaceKey, selectedTestPlan, setSearchParams, setPlanId } = usePageContext();
  const [selectors, setSelectors] = useState([{}, {}]);
  const [tableLoading, setTableLoading] = useState(false);
  const { data: currentUser } = useCurrentUser();

  const detailSearchRef = useRef(null);

  React.useEffect(() => {
    if (selectedTestPlan) {
      // 还原筛选器数据
      detailSearchRef.current?.reset();
      setSearchParams([{}, {}]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestPlan]);

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

  return (
    <div className={cx('test-plan-container')}>
      <div className={cx('plan-header')}>
        <div className={cx('plan-header-body')} style={{ paddingRight: '100px' }}>
          <Space className={cx('header-left')}>
            {t('common.testExecution')}
            <Divider type="vertical" />
            <TestPlanSelector hiddenCheckAll />
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
        locale={{
          emptyText: selectedTestPlan?.objectId ? (
            <NoData
              createTestExecution={createTestExecution}
              addExistedTestExecution={addExistedTestExecution}
              selectorModalRef={selectorModalRef}
            />
          ) : (
            <Empty description={t('common.noData')} />
          ),
        }}
        getDataSource={tableDataGetter}
        handleFilterField={handleFilterField}
        onSuccess={onSuccess}
      />
    </div>
  );
};

export default TestTaskList;
