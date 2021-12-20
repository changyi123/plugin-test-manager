import React from 'react';

import { uniqueId } from 'lodash';
import { Typography, message } from '@osui/ui';
import { EllipsisOutlined, DownOutlined } from '@ant-design/icons';
import { createTestPlanService } from './services';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '../../../PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import TestTableStatus from '@/pages/run/components/TestTableStatus';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';

import cx from './index.less';

const Plan = () => {
  const { testEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();

  const tableDataSourceGetter = React.useCallback(
    async queryParams => {
      const { count, list: testPlans } = await getTestEntitiesByRelation(
        TestRelationType.PlanRelDetail,
        { to: testEntity },
        { fillItemData: true, queryParams: queryParams },
      );
      // 填充 testExecution 数据
      const testPlanIds = testPlans.map(plan => plan.objectId);

      const { list: testExecutions } = await getTestEntitiesByRelation(
        TestRelationType.PlanRelExecution,
        { from: testPlanIds },
        { queryParams: { limit: 9999 } },
      );

      console.log(testExecutions);

      return {
        count,
        list: testPlans,
      };
    },
    [testEntity],
  );

  // 添加测试计划菜单
  const testPlanMenuList = React.useMemo(() => {
    return [
      // TODO
      // {
      //   title: '已存在的测试用例',
      //   onClick() {
      //     console.info(11);
      //   },
      // },
      {
        title: '新建测试计划',
        async onClick() {
          const token = uniqueId('TestPlan');
          const { testEntity: testPlanEntity, extraData } = await createItemUseModal({
            type: TestType.TestPlan,
            extraData: { token },
          });
          // token 不相同则不创建关联
          if (extraData.token !== token) return;

          await createTestPlanService(testEntity, testPlanEntity);

          tableActionRef.current.refresh();

          message.success('测试计划创建成功');
        },
      },
    ];
  }, [createItemUseModal, testEntity]);

  const removeTestRelation = React.useCallback(async relationTypeIds => {
    if (!Array.isArray(relationTypeIds)) return;
    await removeTestRelations(relationTypeIds);

    tableActionRef.current.refresh();

    message.success('删除成功');
  }, []);

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      {
        title: '事项key',
        key: 'reference.name',
        width: 100,
        render(_, record) {
          const item = record?.reference;
          return (
            <Typography.Link
              ellipsis={true}
              target="_blank"
              href={`/osc/workspaces/${item?.workspace?.key}/item/${item?.key}`}
            >
              {item?.key}
            </Typography.Link>
          );
        },
      },
      {
        title: '事项名',
        key: 'reference.name',
        render(_, record) {
          const item = record?.reference;

          return <Typography.Text ellipsis={{ tooltip: item?.name }}>{item?.name}</Typography.Text>;
        },
      },
      {
        title: '最新执行状态',
        dataIndex: 'status',
        key: 'status',
        render: value => {
          return <TestTableStatus readonly status={value ?? 'todo'} />;
        },
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <DropDownButton
            buttonProps={{ type: 'text' }}
            menuList={[
              {
                title: '删除',
                onClick() {
                  removeTestRelation([record.testRelationId]);
                },
              },
            ]}
          >
            <EllipsisOutlined />
          </DropDownButton>
        ),
      },
    ];
  }, [removeTestRelation]);

  return (
    <div className={cx('test')}>
      <DropDownButton menuList={testPlanMenuList}>
        添加至测试计划
        <DownOutlined />
      </DropDownButton>
      <PanelTable
        actionRef={tableActionRef}
        actionMenuList={[
          {
            title: '删除',
            onClick(rows) {
              removeTestRelation(rows.map(row => row.testRelationId));
            },
          },
        ]}
        rowKey="objectId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
      />
    </div>
  );
};

export default React.memo(Plan);
