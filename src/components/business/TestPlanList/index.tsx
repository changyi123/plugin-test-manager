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
import { actionConfirm, generateStaticFileUrl, goToItemDetailPage } from '@/lib/utils/helper';
import { EllipsisOutlined } from '@ant-design/icons';
import { useBaseAction } from '@/lib/hooks/useContext';
import { StatusProgress } from '../Status';
import FilterSearch from '@/components/common/FilterSearch';

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
          select: ['status'],
          include: ['status'],
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
          <div className={cx('plan-table-title')}>
            <div className={cx('plan-table-title-left')}>
              <img
                className={cx('icon')}
                src={generateStaticFileUrl((rowData.reference.itemType as any)?.icon)}
                width="16"
                height="16"
              />
              <span className={cx('test-plan-title')} onClick={() => setSelectedTestPlan(rowData)}>
                {(rowData.reference ?? {}).name}
              </span>
            </div>
            <div className={cx('plan-table-title-right')}>
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
                <EllipsisOutlined className={cx('action', 'right')} style={{ display: 'flex' }} />
              </Dropdown>
            </div>
          </div>
        );
      },
    },
    {
      key: 'completionRate',
      title: '完成率',
      width: 200,
      render(_, rowData) {
        return (
          <StatusProgress
            hasSummary
            statuses={rowData?.refTestDetails.map(testDetail => testDetail.status)}
          />
        );
      },
    },
    {
      key: 'testNums',
      title: '规划用例数',
      align: 'right',
      width: 100,
      render(_, rowData) {
        return <span style={{ color: '#0C62FF' }}>{rowData?.refTestDetails?.length ?? 0}</span>;
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
          'createdBy',
          'assignee',
          'status',
          'completionRate',
          'createdAt',
          'testNums',
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
