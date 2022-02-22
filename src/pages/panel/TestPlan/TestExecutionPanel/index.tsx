import React from 'react';

import { message, Button } from '@osui/ui';
import { useTestConfig } from '@/lib/hooks/useContext';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, {
  ActionType,
  columnBuilder,
  BuiltinColumns,
} from '@/components/panel/PanelTable';
import { alert } from '@/lib/utils/helper';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';
import { addTestExecutionToPlanService } from './service';
import { StatusProgress } from '@/components/common/Status';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();

  const tableDataSourceGetter = React.useCallback(
    queryParams => {
      return getTestEntitiesByRelation(
        TestRelationType.PlanRelExecution,
        { from: testEntity },
        {
          fillItemData: true,
          queryParams: queryParams,
          async resultTransfer({ list, total }) {
            const testExecutionIds = list.map(item => item.objectId);
            const { list: testRuns } = await getTestEntitiesByRelation(
              TestRelationType.ExecutionRelRun,
              {
                from: testExecutionIds,
              },
              {
                limit: 9999,
              },
            );

            return {
              total,
              list: list.map(execution => ({
                ...execution,
                relRuns: testRuns.filter(run => run.relation.from.objectId === execution.objectId),
              })),
            };
          },
        },
      );
    },
    [testEntity],
  );

  // 创建测试执行
  const addExistedTestExecution = React.useCallback(async () => {
    selectorModalRef.current.open({
      testType: TestType.TestExecution,
    });
  }, []);

  const addTestExecutionToPlan = React.useCallback(
    async testExecutionIds => {
      await addTestExecutionToPlanService({
        testPlan: testEntity,
        testExecutionIds,
      });
      tableActionRef.current.refresh();

      alert({
        type: 'success',
        message: `${testExecutionIds.length} 个测试执行添加到测试计划中`,
      });
    },
    [testEntity],
  );

  const removeTestRelation = React.useCallback(async relationTypeIds => {
    if (!Array.isArray(relationTypeIds)) return;
    await removeTestRelations(relationTypeIds);

    tableActionRef.current.refresh();

    alert({
      type: 'success',
      message: `${relationTypeIds.length} 个测试执行从测试计划中删除`,
    });
  }, []);

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.ItemKey, record => ({ item: record.reference })),
      columnBuilder(BuiltinColumns.ItemTitle, record => ({ item: record.reference })),
      {
        title: '测试用例数',
        key: 'count',
        render(_, record) {
          return record.relRuns.length;
        },
      },
      {
        title: '状态',
        key: 'status',
        dataIndex: 'status',
        width: 180,
        render: (_, record) => {
          const statuses = record.relRuns.map(item => item.status);
          return <StatusProgress hasSummary statuses={statuses} />;
        },
      },
      {
        title: '操作',
        width: 120,
        key: 'action',
        render: (_, record) => (
          <a onClick={() => removeTestRelation([record.testRelationId])}>删除</a>
        ),
      },
    ];
  }, [removeTestRelation]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title="添加测试执行至当前测试计划"
        actionRef={selectorModalRef}
        onSelect={addTestExecutionToPlan}
      />

      <PanelTable
        renderActions={() => (
          <Button type="primary" onClick={addExistedTestExecution}>
            添加测试执行任务
          </Button>
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

export default React.memo(Test);
