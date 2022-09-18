import React, { useCallback, useState, useMemo } from 'react';

import { uniqueId } from 'lodash';
import { Table, Tooltip } from 'antd';
import { alert } from '@/lib/utils/helper';
import { Workspace } from '@/lib/types/App';
import { DownOutlined } from '@ant-design/icons';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { TestRelationType, INITIAL_STATUS_KEY } from '@/lib/constants';
import PanelTable, {
  ActionType,
  BuiltinColumns,
  columnBuilder,
} from '@/components/business/PanelTable';
import DropDownButton from '@/components/business/DropDownButton';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { StatusBadge } from '@/components/business/Status';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { QuestionCircleOutlined } from '@/icons';
import { createTestExecutionAndRelations } from '@/lib/api/runs';
import {
  getTestEntitiesByRelation,
  removeTestRelationsWithCondition,
  getTestEntitiesByRelationWithOrder,
  fetchLinkList,
} from '@/lib/api/common';
import { createTestDetailToPlanRelations } from '@/lib/api/relations';
import StatusProcessBar from '@/components/business/StatusProcessBar';
import { TestLinkType, TestType } from 'common/constant';
import cx from './index.less';

const Test = () => {
  const { testEntity, workspace } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();

  const [allTestEntities, setAllTestEntities] = useState([]);

  // 获取计划下的测试用例
  const getAllRelTestEntities = useCallback(async () => {
    const linkItems = testEntity.objectId;
    if (!linkItems) return;
    const { list } = await fetchLinkList({
      linkType: TestLinkType.CaseLinkPlan,
      type: TestType.Plan,
      linkItems,
    });
    setAllTestEntities(list);
  }, [testEntity.objectId]);

  const { testEntityIds, testEntityStatuses } = useMemo(() => {
    return {
      testEntityIds: allTestEntities.map(item => item.objectId),
      testEntityStatuses: allTestEntities.map(
        item => item.detailStatus?.[testEntity.objectId] ?? INITIAL_STATUS_KEY,
      ),
    };
  }, [allTestEntities, testEntity]);

  // 刷新依赖数据
  const refreshDepData = useCallback(() => {
    getAllRelTestEntities();
    tableActionRef.current.refresh();
  }, [getAllRelTestEntities]);

  const tableDataSourceGetter = useCallback(
    async queryParams => {
      const [{ list: testDetails, total }, { list: testRuns }] = await Promise.all([
        getTestEntitiesByRelationWithOrder(
          TestRelationType.PlanRelDetail,
          { from: testEntity },
          {
            fillItemData: true,
            queryParams: queryParams,
            workspaceKey: workspace?.key,
            select: ['detailStatus'],
          },
        ),
        getTestEntitiesByRelation(
          TestRelationType.PlanRelExecution,
          { from: testEntity },
          {
            include: ['reference'],
            queryParams: { limit: 9999 },
            async resultTransfer(data) {
              const testExecutionIds = data.list.map(item => item.objectId);
              const { list: testRuns } = await getTestEntitiesByRelation(
                TestRelationType.ExecutionRelRun,
                {
                  from: testExecutionIds,
                },
                {
                  include: ['objectId', 'runReferenceDetail'],
                  queryParams: { limit: 9999 },
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

      // TODO: 得获取测试用例，以及关联的测试执行

      const list = testDetails.map(detail => {
        return {
          ...detail,
          planId: testEntity.objectId,
          // 关联的测试执行
          relRuns: testRuns.filter(run => run.runReferenceDetail?.objectId === detail.objectId),
        };
      });

      return {
        list,
        total,
      };
    },
    [testEntity, workspace?.key],
  );

  // 创建测试执行
  const createTestExecution = useCallback(async () => {
    const token = uniqueId('TestPlan');
    const res = await createItemUseModal({
      extraData: { token, planId: testEntity?.objectId },
      // TODO: 测试执行 name
      name: uniqueId('测试执行'),
      type: TestType.Run,
    });

    const { testEntity: testExecutionEntity } = res;

    const testExecutionData = testExecutionEntity;

    await createTestExecutionAndRelations({
      testPlan: testEntity,
      testExecution: testExecutionEntity,
      workspaceKey: (testExecutionData.workspace as Workspace).key,
    });

    alert({
      type: 'success',
      message: `测试执行任务【${testExecutionData?.name}】新建成功`,
    });
  }, [createItemUseModal, testEntity]);

  // 添加测试用例菜单
  const testDetailMenuList = useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        async onClick() {
          const testDetailIds = await selectorModalRef.current.open();
          const _testDetailIds = testDetailIds.filter(d => !(testEntityIds ?? []).includes(d));

          await createTestDetailToPlanRelations({
            testPlan: [testEntity?.objectId],
            testDetail: _testDetailIds,
          });

          refreshDepData();

          alert({
            type: 'success',
            message: `${testDetailIds.length} 个测试用例添加到测试计划中`,
          });
        },
      },
      {
        title: '新建测试用例',
        async onClick() {
          const {
            testEntity: newTestDetail,
            item: { name },
          } = await createItemUseModal({
            hideMessage: true,
            type: TestType.Case,
            extraData: {
              folderKey: null,
            },
          });

          await createTestDetailToPlanRelations({
            testPlan: [testEntity?.objectId],
            testDetail: newTestDetail,
          });

          refreshDepData();

          alert({
            type: 'success',
            message: `测试用例 ${name} 已被添加到测试计划中`,
          });
        },
      },
    ];
  }, [createItemUseModal, refreshDepData, testEntity, testEntityIds]);

  const removeTestRelation = useCallback(
    async testDetailIds => {
      if (!Array.isArray(testDetailIds)) return;
      await removeTestRelationsWithCondition(TestRelationType.PlanRelDetail, {
        from: testEntity,
        to: testDetailIds,
      });

      refreshDepData();

      alert({
        type: 'success',
        message: `${testDetailIds.length} 个测试用例从测试计划中删除`,
      });
    },
    [refreshDepData, testEntity],
  );

  // table column 数据
  const tableColumns = useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.ItemKey, record => ({ item: record.reference })),
      columnBuilder(BuiltinColumns.ItemTitle, record => ({ item: record.reference })),
      {
        title: '执行任务数',
        key: 'execution',
        width: 90,
        render: (_, record) => {
          return record.relRuns?.length ?? 0;
        },
      },
      columnBuilder(BuiltinColumns.LatestStatus, record => {
        return {
          status: record.detailStatus?.[testEntity.objectId],
          readonly: true,
        };
      }),
      {
        title: '操作',
        key: 'action',
        align: 'center' as any,
        fixed: 'right' as any,
        width: 90,
        render: (_, record) => (
          <>
            <a onClick={() => removeTestRelation([record.objectId])}>删除</a>
          </>
        ),
      },
    ];
  }, [removeTestRelation, testEntity]);

  // 添加测试执行菜单
  const testExecutionMenuList = useMemo(() => {
    return [
      {
        title: '包含所有测试用例',
        onClick: async () => {
          await createTestExecution();
          refreshDepData();
        },
      },
    ];
  }, [createTestExecution, refreshDepData]);

  const expandedRowRender = useCallback(
    record => {
      // 测试执行序列
      const testIdSequence = record.relRuns?.map(item => item?.objectId).filter(Boolean);

      const columns = [
        {
          key: 'execution',
          title: (
            <span>
              <Tooltip title="该测试用例在以下任务中进行执行">
                测试执行任务
                <QuestionCircleOutlined style={{ marginLeft: 8 }} />
              </Tooltip>
            </span>
          ),
          width: 160,
          tooltip: true,
          render(_, record) {
            const name = record.relExecutions?.[0]?.reference?.name;
            return <OverflowTooltip title={name}>{name}</OverflowTooltip>;
          },
        },
        {
          key: 'status',
          title: '测试执行状态',
          width: 150,
          render(_, record) {
            return <StatusBadge status={record.status} readonly />;
          },
        },
        {
          key: 'action',
          title: '操作',
          width: 120,
          render(_, record) {
            return (
              <a
                onClick={async () => {
                  await testRunModalActionRef.current.open({
                    testId: record.objectId,
                    testIdSequence,
                  });
                  refreshDepData(); //刷新依赖数据
                }}
              >
                执行
              </a>
            );
          },
        },
      ];
      return (
        <Table
          scroll={{
            x: 'max-content',
          }}
          pagination={false}
          rowKey="objectId"
          columns={columns}
          className={cx('inner-table')}
          dataSource={record.relRuns}
        />
      );
    },
    [refreshDepData],
  );

  return (
    <div>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title="添加测试用例到当前测试计划"
        testType={TestType.Plan}
        ignoreTestEntityIds={testEntityIds}
      />
      {/* 状态条的变化 */}
      <StatusProcessBar statuses={testEntityStatuses} />

      <PanelTable
        expandable={{
          expandedRowRender,
          rowExpandable(record) {
            return !!record.relRuns?.length;
          },
        }}
        renderActions={() => (
          <>
            <DropDownButton buttonProps={{ type: 'default' }} menuList={testExecutionMenuList}>
              创建测试执行
              <DownOutlined />
            </DropDownButton>
            <DropDownButton menuList={testDetailMenuList}>
              添加测试用例 <DownOutlined />
            </DropDownButton>
          </>
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

      <TestRunModal actionRef={testRunModalActionRef} selectedTestPlanId={testEntity.objectId} />
    </div>
  );
};

export default React.memo(Test);
