import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, notification } from 'antd';
import _, { uniq } from 'lodash';
import { components } from 'proxima-sdk';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { BusinessTable } from '@/components/dynamicComponents';
import { EditIcon } from '@/icons';
import { getStatsTestPlan, getTestEntityByQuery } from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { goToItemDetailPage } from '@/lib/utils/helper';
import { usePageContext } from '@/pages/plan/hook';

import { StatusProgress } from '../../../components/business/Status';

const { ItemIcon } = components.Components.Common;

import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';

import cx from './index.less';

const TestPlanList: React.FC<any> = () => {
  const { t } = useI18n();
  const actionRef = React.useRef<BusinessTableActionType>();
  const { createItemUseModal, getCreatePermission, testPlanFieldKeys } = useBaseAction();
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan, setSearchParams } = usePageContext();
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
    () => [workspaceKey, ...(testPlanFieldKeys || []), JSON.stringify(selectors)].join('_'),
    [workspaceKey, testPlanFieldKeys, selectors],
  );

  const tableDataGetter = useCallback(
    async (queryParams, tableFields) => {
      if (!workspaceKey || !tableFields?.length)
        return {
          list: [],
          total: 0,
        };
      setTableLoading(true);

      const { list, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Plan,
        },
        fields: uniq(
          ['id'].concat(
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
      title: t('components.business.testPlanList.planName'),
      extraProps: {
        onClick: record => setSelectedTestPlan(record),
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
        const passCount = rowData.caseStatus?.PASSED ?? 0;
        const total =
          Object.values(rowData.caseStatus ?? {})?.reduce((prev: number, cur: number) => {
            prev = prev + cur;
            return prev;
          }, 0) || 1;
        const rate = passCount ? passCount / (total as number) : 0;

        return (
          <div className={cx('table-rate')}>
            <StatusProgress className={cx('status')} hasSummary status={rowData.caseStatus} />
            <span className={cx('rate')}>{`${Math.floor(rate * 100)}%`}</span>
          </div>
        );
      },
    },
    {
      key: 'caseCount',
      title: t('components.business.testPlanList.planCaseCount'),
      align: 'right',
      width: 100,
      render(_, rowData) {
        return <span>{rowData?.caseCount}</span>;
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

  const handleCreate = async () => {
    await createItemUseModal({
      type: TestType.Plan,
      extraData: {
        isDisableCreateNext: true,
      },
    });
    setTimeout(() => {
      actionRef.current.refresh();
    }, 500);
    notification.success({
      message: t('components.business.testPlanList.addPlanSuccess'),
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
          <div className={cx('header-left')}>{t('common.testPlan')}</div>
          <div className={cx('header-right')}>
            <Button
              type="primary"
              disabled={getCreatePermission(TestType.Plan)}
              onClick={() => handleCreate()}
            >
              {t('components.business.testPlanList.addTestPlan')}
            </Button>
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
            testType={TestType.Plan}
          />
        </div>
      </div>
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: TestType.Plan,
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
        name={`${workspaceKey}_TestPlanTable`}
        actionRef={actionRef}
        loading={tableLoading}
        getDataSource={tableDataGetter}
        handleFilterField={handleFilterField}
        onSuccess={onSuccess}
      />
    </div>
  );
};

export default TestPlanList;
