import React from 'react';

import { uniqueId } from 'lodash';
import { Typography, message } from '@osui/ui';
import { createTestPlanService } from './services';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import { EllipsisOutlined, DownOutlined } from '@ant-design/icons';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';
import {
  createTestRelation,
  removeTestRelations,
  getTestEntitiesByRelation,
} from '@/lib/api/common';
import { useAllRelTestEntityIds } from '@/lib/hooks/useTest';

import cx from './index.less';

const Plan = () => {
  const { testEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();
  const { testEntityIds, refresh: getAllRelTestEntityIds } = useAllRelTestEntityIds(
    TestRelationType.PlanRelDetail,
    {
      to: testEntity,
    },
  );

  // 刷新依赖数据
  const refreshDepData = React.useCallback(() => {
    getAllRelTestEntityIds();
    tableActionRef.current.refresh();
  }, [getAllRelTestEntityIds]);

  const tableDataSourceGetter = React.useCallback(
    async queryParams => {
      const { list: testPlans, total } = await getTestEntitiesByRelation(
        TestRelationType.PlanRelDetail,
        { to: testEntity },
        {
          fillItemData: true,
          queryParams: queryParams,
        },
      );

      const testPlanIds = testPlans.map(item => item.objectId);

      // 获取测试执行，包含测试运行 testRuns
      const { list: testExecutions } = await getTestEntitiesByRelation(
        TestRelationType.PlanRelExecution,
        { from: testPlanIds },
        {
          queryParams: { limit: 9999 },
          async resultTransfer(data) {
            const { list: testExecutions, count } = data;
            const testExecutionIds = testExecutions.map(item => item.objectId);

            const { list: testRuns } = await getTestEntitiesByRelation(
              TestRelationType.ExecutionRelRun,
              {
                from: testExecutionIds,
              },
              { queryParams: { limit: 9999 } },
            );

            return {
              count,
              list: testExecutions.map(execution => {
                const relRuns = testRuns.filter(
                  run => run.relation?.from?.objectId === execution.objectId,
                );
                return {
                  ...execution,
                  testRuns: relRuns,
                };
              }),
            };
          },
        },
      );

      const list = testPlans.map(plan => {
        const relTestExecutions = testExecutions.filter(
          exec => exec.relation?.from?.objectId === plan.objectId,
        );
        return {
          ...plan,
          testExecutions: relTestExecutions,
        };
      });

      return {
        total,
        list,
      };
    },
    [testEntity],
  );

  // 添加测试计划菜单
  const testPlanMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试计划',
        onClick() {
          selectorModalRef.current.open({
            testType: TestType.TestPlan,
          });
        },
      },
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

          refreshDepData();

          message.success('测试计划创建成功');
        },
      },
    ];
  }, [createItemUseModal, refreshDepData, testEntity]);

  const removeTestRelation = React.useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;
      await removeTestRelations(relationTypeIds);

      refreshDepData();

      message.success('删除成功');
    },
    [refreshDepData],
  );

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
      // {
      //   title: '测试计划状态',
      //   dataIndex: 'status',
      //   key: 'status',
      //   render: (_, record) => {
      //     console.log(record);
      //     return 1;
      //   },
      // },
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

  // 添加测试用例至测试计划
  const addTestDetailToPlan = React.useCallback(
    async testPlanIds => {
      const relations = testPlanIds.map(testPlanId => ({
        relationType: TestRelationType.PlanRelDetail,
        from: testPlanId,
        to: testEntity,
      }));
      await createTestRelation(relations);

      tableActionRef.current.refresh();
    },
    [testEntity],
  );

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title="添加测试执行至当前测试计划"
        actionRef={selectorModalRef}
        onSelect={addTestDetailToPlan}
        ignoreTestEntityIds={testEntityIds}
      />
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
