import React, { useCallback, useRef, useState } from 'react';
import { usePageContext } from '@/pages/plan/hook';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { Button, notification } from 'antd';
import { goToItemDetailPage } from '@/lib/utils/helper';
import { useBaseAction } from '@/lib/hooks/useContext';
import { StatusProgress } from '../../../components/business/Status';
import FilterSearch from '@/components/common/FilterSearch';
import { EditIcon } from '@/icons';
import { components } from 'proxima-sdk';
import { getStatsTestPlan, getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { useRequest } from 'ahooks';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import useI18n from '@/lib/hooks/useI18n';
import _ from 'lodash';

const { ItemIcon } = components.Components.Common;

import cx from './index.less';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';

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

  const tableDataGetter = useCallback(
    async queryParams => {
      if (!workspaceKey || !testPlanFieldKeys)
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
        fields: [].concat(SystemFieldKeys, testPlanFieldKeys),
        selector: selectors,
        ...queryParams,
      });

      const stats = await getStatsTestPlan({
        planIds: list.map(d => d.objectId),
        select: ['caseStatus', 'caseCount'],
      });

      const testPlans = _.chain(list)
        .map(testPlan => {
          return {
            ...testPlan,
            ...stats?.[testPlan.objectId],
            status: testPlan.workflowStatus,
          };
        })
        .value();

      setTableLoading(false);

      return {
        list: testPlans ?? [],
        total: total ?? 0,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceKey, testPlanFieldKeys, JSON.stringify(selectors)],
  );

  const { data: currentFields } = useRequest(
    async () => {
      return await getCurrentUserSetting({ workspaceKey, user: currentUser });
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
      className: 'test-case-title',
      extraProps: {
        onClick: record => setSelectedTestPlan(record),
      },
      render(_, rowData) {
        return (
          <div className={'test-plan-title-box'}>
            {ItemIcon && <ItemIcon className={'icon'} icon={rowData.itemType?.icon}></ItemIcon>}
            <div className={'test-plan-title'}>{rowData.name}</div>
            <div
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
            </div>
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
    actionRef.current.refresh();
    notification.success({
      message: t('components.business.testPlanList.addPlanSuccess'),
    });
  };

  const handleFilterField = useCallback(
    async ({ testType, fieldKeys }) => {
      await saveUserSetting({
        workspaceKey,
        user: currentUser,
        testType,
        filterFields: {
          ...(currentFields?.filterFields ?? {}),
          [testType]: fieldKeys,
        },
      });
    },
    [currentUser, workspaceKey, currentFields],
  );

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
      />
    </div>
  );
};

export default TestPlanList;
