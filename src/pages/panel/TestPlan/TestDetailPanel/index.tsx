import React from 'react';

import { uniqueId } from 'lodash';
import { Table } from '@osui/ui';
import { alert } from '@/lib/utils/helper';
import { Workspace } from '@/lib/types/App';
import { DownOutlined } from '@ant-design/icons';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, {
  ActionType,
  BuiltinColumns,
  columnBuilder,
} from '@/components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';
import { StatusBadge } from '@/components/common/Status';
import { useAllRelTestEntityIds } from '@/lib/hooks/useTest';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';
import { createTestExecutionService, addTestDetailToPlanService } from './services';

const Test = () => {
  const { testEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();

  const { testEntityIds, refresh: getAllRelTestEntityIds } = useAllRelTestEntityIds(
    TestRelationType.PlanRelDetail,
    {
      from: testEntity,
    },
  );

  // 刷新依赖数据
  const refreshDepData = React.useCallback(() => {
    getAllRelTestEntityIds();
    tableActionRef.current.refresh();
  }, [getAllRelTestEntityIds]);

  const tableDataSourceGetter = React.useCallback(
    async queryParams => {
      const [{ list: testDetails, total }, { list: testRuns }] = await Promise.all([
        getTestEntitiesByRelation(
          TestRelationType.PlanRelDetail,
          { from: testEntity },
          {
            fillItemData: true,
            queryParams: queryParams,
          },
        ),
        getTestEntitiesByRelation(
          TestRelationType.PlanRelExecution,
          { from: testEntity },
          {
            fillItemData: true,
            queryParams: { limit: 999 },
            include: ['objectId'],
            async resultTransfer(data) {
              const testExecutionIds = data.list.map(item => item.objectId);
              const { list: testRuns } = await getTestEntitiesByRelation(
                TestRelationType.ExecutionRelRun,
                {
                  from: testExecutionIds,
                },
                {
                  include: ['objectId'],
                  queryParams: { limit: 999 },
                },
              );
              return {
                ...data,
                list: testRuns.map(run => ({
                  ...run,
                  // 关联的 relations
                  relExecutions: data.list.filter(
                    item => item.objectId === run.relation.from.objectId,
                  ),
                })),
              };
            },
          },
        ),
      ]);

      const list = testDetails.map(detail => {
        return {
          ...detail,
          // 关联的测试执行
          relRuns: testRuns.filter(run => run.runReferenceDetail.objectId === detail.objectId),
        };
      });

      return {
        list,
        total,
      };
    },
    [testEntity],
  );

  // 创建测试执行
  const createTestExecution = React.useCallback(async () => {
    const token = uniqueId('TestPlan');
    const res = await createItemUseModal({
      extraData: { token },
      // TODO: 测试执行 name
      name: uniqueId('测试执行'),
      type: TestType.TestExecution,
    });

    const { testEntity: testExecutionEntity, extraData } = res;
    // token 不相同则不创建关联
    if (extraData.token !== token) return;

    const testExecutionData = testExecutionEntity.toJSON();

    const testExecution = await createTestExecutionService({
      testPlan: testEntity,
      testExecution: testExecutionEntity,
      workspaceKey: (testExecutionData.reference.workspace as Workspace).key,
    });

    alert({
      type: 'success',
      message: `测试执行【${testExecution?.get('reference')?.get('name')}】新建成功`,
    });
  }, [createItemUseModal, testEntity]);

  // 添加测试用例菜单
  const testDetailMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        async onClick() {
          const testDetailIds = await selectorModalRef.current.open();
          await addTestDetailToPlanService({
            testPlan: testEntity,
            testDetailIds,
          });

          refreshDepData();

          alert({
            type: 'success',
            message: `${testDetailIds.length} 个测试用例添加到测试计划中`,
          });
        },
      },
    ];
  }, [refreshDepData, testEntity]);

  const removeTestRelation = React.useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;
      await removeTestRelations(relationTypeIds);

      refreshDepData();

      alert({
        type: 'success',
        message: `${relationTypeIds.length} 个测试用例从测试计划中删除`,
      });
    },
    [refreshDepData],
  );

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.ItemKey, record => ({ item: record.reference })),
      columnBuilder(BuiltinColumns.ItemTitle, record => ({ item: record.reference })),
      {
        title: '执行轮次',
        key: 'execution',
        render: (_, record) => {
          return record.relRuns?.length ?? 0;
        },
      },
      columnBuilder(BuiltinColumns.LatestStatus, record => ({
        status: record.status,
        readonly: true,
      })),
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <>
            <a onClick={() => removeTestRelation([record.testRelationId])}>删除</a>
          </>
        ),
      },
    ];
  }, [removeTestRelation]);

  // 添加测试执行菜单
  const testExecutionMenuList = React.useMemo(() => {
    return [
      {
        title: '所有测试用例',
        onClick: createTestExecution,
      },
    ];
  }, [createTestExecution]);

  const expandedRowRender = React.useCallback(record => {
    const columns = [
      {
        key: 'execution',
        title: '测试运行轮次',
        ellipsis: {
          showTitle: false,
        },
        tooltip: true,
        render(_, record) {
          const name = record.relExecutions?.[0]?.reference?.name;
          return <OverflowTooltip title={name}>{name}</OverflowTooltip>;
        },
      },
      {
        key: 'status',
        title: '执行状态',
        render(_, record) {
          return <StatusBadge status={record.status} readonly />;
        },
      },
      {
        key: 'action',
        title: '操作',
        // fixed: 'right',
        render() {
          return (
            <>
              <a>执行</a>
            </>
          );
        },
      },
    ];
    return (
      <Table pagination={false} rowKey="objectId" columns={columns} dataSource={record.relRuns} />
    );
  }, []);

  return (
    <div>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title="添加测试用例到当前测试计划"
        testType={TestType.TestDetail}
        ignoreTestEntityIds={testEntityIds}
      />

      <PanelTable
        expandable={{
          expandedRowRender,
          rowExpandable(record) {
            return !!record.relRuns?.length;
          },
        }}
        renderActions={() => (
          <>
            <DropDownButton menuList={testDetailMenuList}>
              添加测试用例 <DownOutlined />
            </DropDownButton>
            <DropDownButton menuList={testExecutionMenuList}>
              创建测试执行
              <DownOutlined />
            </DropDownButton>
          </>
        )}
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

export default React.memo(Test);
