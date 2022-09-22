import React, { useCallback, useState } from 'react';

import { Button } from 'antd';
import { useTestConfig } from '@/lib/hooks/useContext';
import { TestLinkType, TestType } from '@/lib/constants';
import PanelTable, {
  ActionType,
  columnBuilder,
  BuiltinColumns,
} from '@/components/business/PanelTable';
import { alert } from '@/lib/utils/helper';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { StatusProgress } from '@/components/business/Status';
import { fetchLinkList } from '@/lib/api/common';
import { getStatsTestExecution, updateTestEntity } from '@/lib/api/item';
import cx from './index.less';

const Test = () => {
  const { testEntity, workspace } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();

  const [allTestEntities, setAllTestEntities] = useState([]);

  // 获取计划下的测试用例
  const getAllRelTestEntities = useCallback(
    async params => {
      const sourceIds = testEntity.objectId;
      if (!sourceIds) return;
      // 获取计划下的所有执行
      const { list, total } = await fetchLinkList({
        linkType: TestLinkType.ExecutionLinkPlan,
        sourceIds: testEntity?.objectId,
        destinationType: TestType.Execution,
        workspaceKey: workspace?.key,
        ...params,
      });

      if (list?.length) {
        // 查出执行对应的用例
        const stats = await getStatsTestExecution({
          executionIds: list.map(item => item.objectId),
          select: ['runCount', 'runStatus'],
        });
        // 组合数据
        list.forEach(item => {
          item.stats = stats[item.objectId] || {};
        });
      }

      setAllTestEntities(list);

      return {
        list,
        total,
      };
    },
    [testEntity.objectId, workspace?.key],
  );

  const refresh = React.useCallback(() => {
    tableActionRef.current.refresh();
  }, []);

  const tableDataSourceGetter = React.useCallback(
    params => getAllRelTestEntities(params),
    [getAllRelTestEntities],
  );

  // 创建测试执行
  const addExistedTestExecution = React.useCallback(async () => {
    selectorModalRef.current.open({
      testType: TestType.Execution,
    });
  }, []);

  const addTestExecutionToPlan = React.useCallback(
    async relationTypeIds => {
      await updateTestEntity(
        relationTypeIds.map(objectId => ({
          linkType: TestLinkType.ExecutionLinkPlan,
          objectId,
          linkItems: { action: 'add', value: [testEntity.objectId] },
        })),
      );
      refresh();
      alert({
        type: 'success',
        message: `${relationTypeIds.length} 个测试执行添加到测试计划中`,
      });
    },
    [refresh, testEntity?.objectId],
  );

  const removeTestRelation = React.useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;

      // 移除测试计划下的任务
      await updateTestEntity(
        relationTypeIds.map(objectId => ({
          objectId,
          linkItems: { action: 'delete', value: [testEntity.objectId] },
        })),
      );

      refresh();

      alert({
        type: 'success',
        message: `${relationTypeIds.length} 个测试执行从测试计划中删除`,
      });
    },
    [refresh, testEntity.objectId],
  );

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.ItemKey, record => ({ item: record })),
      columnBuilder(BuiltinColumns.ItemTitle, record => ({ item: record })),
      {
        title: '测试用例数',
        key: 'count',
        render(_, record) {
          return record.stats?.runCount;
        },
      },
      {
        title: '状态',
        key: 'status',
        dataIndex: 'status',
        width: 180,
        render: (_, record) => {
          return <StatusProgress hasSummary status={record.stats.runStatus} />;
        },
      },
      {
        title: '操作',
        width: 120,
        key: 'action',
        render: (_, record) => <a onClick={() => removeTestRelation([record.objectId])}>删除</a>,
      },
    ];
  }, [removeTestRelation]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title="添加测试执行至当前测试计划"
        onSelect={addTestExecutionToPlan}
        ignoreTestEntityIds={allTestEntities?.map(item => item.objectId)}
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
        rowKey="objectId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
      />
    </div>
  );
};

export default React.memo(Test);
