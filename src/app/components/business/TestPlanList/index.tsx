import React, { useCallback, useRef, useState } from 'react';
import { usePageContext } from '@/pages/plan/hook';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { Button, Dropdown, Menu, notification } from 'antd';
import _ from 'lodash';
import { actionConfirm, goToItemDetailPage } from '@/lib/utils/helper';
import { useBaseAction } from '@/lib/hooks/useContext';
import { StatusProgress } from '../Status';
import FilterSearch from '@/components/common/FilterSearch';
import { FullScreen } from '@/icons';
import { components } from 'proxima-sdk';
import { deleteTestEntity, getStatsTestPlan, getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';

const { ItemIcon } = components.Components.Common;

import cx from './index.less';

const TestPlanList: React.FC<any> = () => {
  const actionRef = React.useRef<BusinessTableActionType>();
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan, selectors, setSearchParams } =
    usePageContext();
  const [tableLoading, setTableLoading] = useState(false);
  const { createItemUseModal } = useBaseAction();

  const detailSearchRef = useRef(null);

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
        selectors,
        ...queryParams,
        descending: ['createdAt'],
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
          };
        })
        .value();

      setTableLoading(false);

      return {
        list: testPlans ?? [],
        total: total ?? 0,
      };
    },
    [workspaceKey, selectors],
  );

  const handleDelete = async data => {
    await actionConfirm('该操作会当前删除测试计划以及测试计划关联的测试用例和任务，是否继续？');
    await deleteTestEntity([data.objectId]);
    actionRef.current.refresh();
    // 重新选中
    setSelectedTestPlan(null);
    notification.success({
      message: '测试计划删除成功',
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
      title: '计划名称',
      render(_, rowData) {
        return (
          <div className={'test-plan-title-box'}>
            {ItemIcon && <ItemIcon className={'icon'} icon={rowData.itemType?.icon}></ItemIcon>}
            <div className={'test-plan-title'} onClick={() => setSelectedTestPlan(rowData)}>
              {rowData.name}
            </div>
            <div className={'plan-table-title-menu'}>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item key="delete" onClick={() => handleDelete(rowData)}>
                      删除测试计划
                    </Menu.Item>
                    <Menu.Item key="view" onClick={() => handleView(rowData)}>
                      查看测试计划
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
      key: 'completionRate',
      title: '执行通过率',
      width: 240,
      render(_, rowData) {
        const passCount = rowData.caseStatus?.PASSED ?? 0;
        const total = Object.values(rowData.caseStatus).reduce((prev: number, cur: number) => {
          prev = prev + cur;
          return prev;
        }, 0);

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
      title: '规划用例数',
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
    });
    actionRef.current.refresh();
    notification.success({
      message: '测试计划新建成功',
    });
  };

  return (
    <div className={cx('test-plan-container')}>
      <div className={cx('plan-header')}>
        <div className={cx('plan-header-body')}>
          <div className={cx('header-left')}>测试计划</div>
          <div className={cx('header-right')}>
            <Button type="primary" onClick={() => handleCreate()}>
              新建测试计划
            </Button>
          </div>
        </div>
        <div className={cx('plan-header-slot')}>
          <FilterSearch
            className={cx('test-manager-filter')}
            ref={detailSearchRef}
            fields={['createdBy', 'priority', 'assignee', 'createdAt']}
            extendFields={[]}
            onSearch={setSearchParams}
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
          'testNum',
          'assignee',
          'createdAt',
          'createdBy',
          'completionRate',
        ]}
        rowKey="objectId"
        columns={columns}
        name="TestPlanTable"
        actionRef={actionRef}
        loading={tableLoading}
        getDataSource={tableDataGetter}
      />
    </div>
  );
};

export default TestPlanList;
