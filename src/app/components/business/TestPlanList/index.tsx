import React, { useCallback, useRef, useState } from 'react';
import { usePageContext } from '@/pages/plan/hook';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import { Button, Dropdown, Menu, message, notification } from 'antd';
import _ from 'lodash';
import { actionConfirm, goToItemDetailPage } from '@/lib/utils/helper';
import { useBaseAction } from '@/lib/hooks/useContext';
import { StatusProgress } from '../Status';
import FilterSearch from '@/components/common/FilterSearch';
import { FullScreen } from '@/icons';
import { components } from 'proxima-sdk';
import { deleteTestEntity, getStatsTestPlan, getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { useRequest } from 'ahooks';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import useI18n from '@/lib/hooks/useI18n';

const { ItemIcon } = components.Components.Common;

import cx from './index.less';

const TestPlanList: React.FC<any> = () => {
  const { t } = useI18n();
  const actionRef = React.useRef<BusinessTableActionType>();
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan, selectors, setSearchParams } =
    usePageContext();
  const [tableLoading, setTableLoading] = useState(false);
  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const { data: currentUser } = useCurrentUser();

  const detailSearchRef = useRef(null);

  const testDetailFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Plan,
    workspaceKey,
  });

  React.useEffect(() => {
    // 还原筛选器数据
    detailSearchRef.current?.reset();
    setSearchParams([{}, {}]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestPlan]);

  const tableDataGetter = useCallback(
    async queryParams => {
      setTableLoading(true);
      const { list, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Plan,
        },
        fields: testDetailFieldKeys ?? [],
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
    [workspaceKey, selectors, testDetailFieldKeys],
  );

  const { data: currentFields } = useRequest(
    async () => {
      return await getCurrentUserSetting({ workspaceKey, user: currentUser });
    },
    {
      refreshDeps: [workspaceKey, currentUser],
    },
  );

  const handleDelete = async data => {
    await actionConfirm({
      title: t('common.tip'),
      okText: t('common.okText'),
      cancelText: t('common.cancel'),
      content: t('components.business.testPlanList.deleteLinkTips'),
    });
    setTableLoading(true);
    const res = await deleteTestEntity([data.objectId]);
    if (res?.status === 'error') {
      setTableLoading(false);
      message.error(res.data);
      return;
    }
    actionRef.current.refresh();
    // 重新选中
    setSelectedTestPlan(null);
    setTableLoading(false);
    notification.success({
      message: t('components.business.testPlanList.deletePlanSuccess'),
    });
  };

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
        onClick: record => {
          setSelectedTestPlan(record);
        },
      },
      render(_, rowData) {
        return (
          <div className={'test-plan-title-box'}>
            {ItemIcon && <ItemIcon className={'icon'} icon={rowData.itemType?.icon}></ItemIcon>}
            <div className={'test-plan-title'}>{rowData.name}</div>
            <div className={'plan-table-title-menu'}>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item
                      key="delete"
                      onClick={item => {
                        item.domEvent.stopPropagation();
                        handleDelete(rowData);
                      }}
                    >
                      {t('components.business.testPlanList.deleteTestPlan')}
                    </Menu.Item>
                    <Menu.Item
                      key="view"
                      onClick={item => {
                        item.domEvent.stopPropagation();
                        handleView(rowData);
                      }}
                    >
                      {t('components.business.testPlanList.checkTestPlan')}
                    </Menu.Item>
                  </Menu>
                }
                trigger={['hover']}
              >
                <FullScreen className={cx('action', 'right')} style={{ display: 'flex' }} />
              </Dropdown>
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
          Object.values(rowData.caseStatus).reduce((prev: number, cur: number) => {
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
            className={cx('test-manager-filter')}
            ref={detailSearchRef}
            fields={getFilterFields(testDetailFieldKeys)}
            extendFields={[]}
            onSearch={setSearchParams}
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
