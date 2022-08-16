import React, { useCallback, useRef, useState } from 'react';
import { usePageContext } from '@/pages/plan/hook';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { Button, Dropdown, Menu, notification } from 'antd';
import {
  deleteTestEntities,
  getTestEntitiesByQuery,
  getTestEntitiesByRelation,
} from '@/lib/api/common';
import { TestRelationType, TestType } from '@/lib/constants';
import _ from 'lodash';
import { TestPlanEntity } from '@/pages/plan/type';
import { TestEntity } from '@/lib/types/Test';
import { deleteItems } from '@/lib/api/proxima';
import { actionConfirm, goToItemDetailPage } from '@/lib/utils/helper';
import { useBaseAction } from '@/lib/hooks/useContext';
import { StatusProgress } from '../Status';
import FilterSearch from '@/components/common/FilterSearch';
import { FullScreen } from '@/icons';
import { components } from 'proxima-sdk';

const { ItemIcon } = components.Components.Common;

import cx from './index.less';

type TestPlan = TestPlanEntity & {
  refTestDetails: Pick<TestEntity, 'status'>[];
};

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

      const { results, count } = await getTestEntitiesByQuery(
        {
          selectors,
          workspaceKey,
          type: TestType.TestPlan,
        },
        {
          ...queryParams,
          ignoreDeletedItemData: true,
          descendingBy: ['createdAt'],
          include: ['reference.status'],
        },
      );

      const { list: allRelationTestDetails } = await getTestEntitiesByRelation(
        TestRelationType.PlanRelDetail,
        {
          from: results.map(item => item.objectId),
        },
        {
          // FIXME: 优化查询速度
          workspaceKey,
          select: ['detailStatus'],
          include: ['detailStatus'],
          queryParams: { limit: 9999, offset: 0 },
        },
      );

      const testPlans = _.chain(results)
        .map(testPlan => {
          return {
            ...testPlan,
            refTestDetails: allRelationTestDetails.filter(
              testDetail => _.get(testDetail, 'relation.from.objectId') === testPlan.objectId,
            ),
          };
        })
        .value() as TestPlan[];

      setTableLoading(false);

      return {
        list: testPlans,
        total: count,
      };
    },
    [workspaceKey, selectors],
  );

  const handleDelete = async data => {
    await actionConfirm('该操作会当前删除测试计划以及测试计划关联的测试用例和任务，是否继续？');
    await Promise.all([
      deleteTestEntities([data.objectId]),
      deleteItems([data.reference?.objectId]),
    ]);
    actionRef.current.refresh();
    // 重新选中
    setSelectedTestPlan({} as any);
    notification.success({
      message: '测试计划删除成功',
    });
  };

  const handleView = data => {
    const itemData = data.reference ?? {};
    goToItemDetailPage({
      workspaceKey: itemData.workspace?.key,
      itemKey: itemData.key,
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
            {ItemIcon && (
              <ItemIcon className={'icon'} icon={rowData.reference.itemType?.icon}></ItemIcon>
            )}
            <div className={'test-plan-title'} onClick={() => setSelectedTestPlan(rowData)}>
              {(rowData.reference ?? {}).name}
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
        const status =
          rowData?.refTestDetails.map(testDetail => testDetail.detailStatus?.[rowData.objectId]) ??
          [];
        const passNum = status.filter(d => d === 'PASSED') ?? [];
        const rate = status.length === 0 ? 0 : passNum.length / status.length;

        return (
          <div className={cx('table-rate')}>
            <StatusProgress className={cx('status')} hasSummary statuses={status} />
            <span className={cx('rate')}>{`${Math.floor(rate * 100)}%`}</span>
          </div>
        );
      },
    },
    {
      key: 'testNum',
      title: '规划用例数',
      align: 'right',
      width: 100,
      render(_, rowData) {
        return <span>{rowData?.refTestDetails?.length ?? 0}</span>;
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
      type: TestType.TestPlan,
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
          testType: 'TestPlan',
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
