import React from 'react';

import { DownOutlined } from '@ant-design/icons';
import { StatusProgress } from '@/components/common/Status';
import { TestType, TestRelationType } from '@/lib/constants';
import DropDownButton from '@/components/panel/DropDownButton';
import { createTestDetailToPlanRelations } from '@/lib/api/relations';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import { BuiltinColumns, columnBuilder } from '@/components/panel/PanelTable';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';
import {
  createTestRelation,
  removeTestRelations,
  getTestEntitiesByRelation,
} from '@/lib/api/common';
import { useAllRelTestEntities } from '@/lib/hooks/useTest';
import { alert } from '@/lib/utils/helper';

import cx from './index.less';

const Plan = () => {
  const { testEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();
  const { testEntities: allTestEntityId, refresh: getAllRelTestEntities } = useAllRelTestEntities(
    TestRelationType.PlanRelDetail,
    {
      to: testEntity,
    },
  );

  // 刷新依赖数据
  const refreshDepData = React.useCallback(() => {
    getAllRelTestEntities();
    tableActionRef.current.refresh();
  }, [getAllRelTestEntities]);

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

      // 测试执行任务 testRuns
      const { list: testDetails } = await getTestEntitiesByRelation(
        TestRelationType.PlanRelDetail,
        { from: testPlanIds },
        {
          queryParams: { limit: 9999 },
        },
      );

      const list = testPlans.map(plan => {
        const relTestDetails = testDetails.filter(
          detail => detail.relation?.from?.objectId === plan.objectId,
        );
        return {
          ...plan,
          relTestDetails,
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
        async onClick() {
          const testPlanIds = await selectorModalRef.current.open();
          const relations = testPlanIds.map(testPlanId => ({
            relationType: TestRelationType.PlanRelDetail,
            from: testPlanId,
            to: testEntity,
          }));
          await createTestRelation(relations);

          alert({
            type: 'success',
            message: `当前测试用例添加到测试计划中`,
          });

          refreshDepData();
        },
      },
      {
        title: '新建测试计划',
        async onClick() {
          const { testEntity: testPlanEntity, item } = await createItemUseModal({
            type: TestType.TestPlan,
          });

          try {
            await createTestDetailToPlanRelations({
              testDetail: testEntity,
              testPlan: testPlanEntity,
            });
          } catch (err) {
            console.error(err);
          }

          refreshDepData();

          alert({
            type: 'success',
            message: `测试计划【${item.name}】新建成功`,
          });
        },
      },
    ];
  }, [createItemUseModal, refreshDepData, testEntity]);

  const removeTestRelation = React.useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;
      await removeTestRelations(relationTypeIds);

      refreshDepData();

      alert({
        type: 'success',
        message: '当前测试用例从测试计划中删除',
      });
    },
    [refreshDepData],
  );

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.ItemKey, data => ({
        item: data.reference,
      })),
      columnBuilder(BuiltinColumns.ItemTitle, data => ({
        item: data.reference,
      })),
      {
        title: '测试计划状态',
        key: 'status',
        width: 190,
        render(_, record) {
          const detailStatuses = record.relTestDetails.map(item => item.status);
          return <StatusProgress statuses={detailStatuses} hasSummary />;
        },
      },
      {
        title: '测试用例数',
        key: 'count',
        render(_, record) {
          return record.relTestDetails?.length ?? 0;
        },
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        render: (_, record) => (
          <a onClick={() => removeTestRelation([record.testRelationId])}>删除</a>
        ),
      },
    ] as any[];
  }, [removeTestRelation]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title="添加当前用例至选中的测试计划中"
        actionRef={selectorModalRef}
        testType={TestType.TestPlan}
        ignoreTestEntityIds={allTestEntityId}
      />
      <PanelTable
        renderActions={() => (
          <DropDownButton menuList={testPlanMenuList}>
            添加至测试计划
            <DownOutlined />
          </DropDownButton>
        )}
        actionRef={tableActionRef}
        actionMenuList={[
          {
            title: '删除',
            onClick(selectedRowKeys) {
              removeTestRelation(selectedRowKeys);
            },
          },
        ]}
        rowKey="testRelationId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
      />
    </div>
  );
};

export default React.memo(Plan);
