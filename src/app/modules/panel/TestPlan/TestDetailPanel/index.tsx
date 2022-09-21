import React, { useCallback, useState, useMemo } from 'react';

import { uniqueId } from 'lodash';
import { Table, Tooltip } from 'antd';
import { alert } from '@/lib/utils/helper';
import { DownOutlined } from '@ant-design/icons';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { INITIAL_STATUS_KEY, TestLinkType, TestType } from '@/lib/constants';
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
import { fetchLinkList } from '@/lib/api/common';
import StatusProcessBar from '@/components/business/StatusProcessBar';
import cx from './index.less';
import { getRunsFromCase, updateTestEntity } from '@/lib/api/item';

const Test = () => {
  const { testEntity, workspace } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();

  const [allTestEntities, setAllTestEntities] = useState([]);
  // 统计状态
  const [stats, setStats] = useState({});

  // 获取计划下的测试用例
  const getAllRelTestEntities = useCallback(
    async pages => {
      const sourceIds = testEntity.objectId;
      let stats = {};
      if (!sourceIds) return;
      // 获取计划下的所有测试用例
      const { list: caseList, total } = await fetchLinkList({
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: testEntity?.objectId,
        destinationType: TestType.Case,
        workspaceKey: workspace?.key,
        ...pages,
      });

      if (caseList?.length) {
        // 测试用例关联测试执行
        stats = await getRunsFromCase({
          caseIds: caseList.map(item => item.objectId),
          planId: sourceIds,
          select: ['runCount', 'caseLatestStatus'],
        });
      }

      setStats(stats);

      // 组装测试执行
      const list = caseList.map(detail => {
        return {
          ...detail,
          planId: testEntity.objectId,
          // 关联的测试执行
          relRuns: stats[detail.objectId] || {},
        };
      });

      setAllTestEntities(list);

      return {
        list,
        total,
      };
    },
    [testEntity.objectId, workspace?.key],
  );

  // 组装status
  const status = useMemo(() => {
    const res = {};
    Object.keys(stats).forEach(id => {
      const { runCount: num, caseLatestStatus: statueName } = stats[id];
      res[statueName] = res[statueName] || 0 + num;
    });
    return res;
  }, [stats]);

  const { testEntityIds } = useMemo(() => {
    return {
      testEntityIds: allTestEntities.map(item => item.objectId),
      testEntityStatuses: allTestEntities.map(
        item => item.detailStatus?.[testEntity.objectId] ?? INITIAL_STATUS_KEY,
      ),
    };
  }, [allTestEntities, testEntity]);

  // 刷新依赖数据
  const refreshDepData = useCallback(() => tableActionRef.current.refresh(), []);

  const tableDataSourceGetter = useCallback(
    async params => {
      const { list, total } = await getAllRelTestEntities(params);
      return { list, total };
    },
    [getAllRelTestEntities],
  );

  // 创建测试执行
  const createTestExecution = useCallback(async () => {
    const token = uniqueId('TestPlan');
    const { item: testExecution } = await createItemUseModal({
      extraData: { token, planId: testEntity?.objectId },
      // TODO: 测试执行 name
      name: uniqueId('测试执行'),
      type: TestType.Execution,
    });

    // TODO: 关联测试执行
    // await createTestExecutionAndRelations({
    //   testPlan: testEntity,
    //   testExecution,
    //   workspaceKey: (testExecution.workspace as Workspace).key,
    // });

    alert({
      type: 'success',
      message: `测试执行任务【${testExecution?.name}】新建成功`,
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

          await updateTestEntity(
            _testDetailIds.map(objectId => ({
              linkType: TestLinkType.CaseLinkPlan,
              objectId,
              linkItems: { action: 'add', value: [testEntity.objectId] },
            })),
          );

          refreshDepData();

          alert({
            type: 'success',
            message: `${_testDetailIds.length} 个测试用例添加到测试计划中`,
          });
        },
      },
      {
        title: '新建测试用例',
        async onClick() {
          const {
            item: { name, objectId },
          } = await createItemUseModal({
            hideMessage: true,
            type: TestType.Case,
            extraData: {
              folderKey: null,
            },
          });

          await updateTestEntity([
            {
              linkType: TestLinkType.CaseLinkPlan,
              objectId,
              linkItems: { action: 'add', value: [testEntity.objectId] },
            },
          ]);

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
      // 移除测试用例和计划的关联
      await updateTestEntity(
        testDetailIds.map(objectId => ({
          objectId,
          linkItems: { action: 'delete', value: [testEntity.objectId] },
        })),
      );

      refreshDepData();

      alert({
        type: 'success',
        message: `${testDetailIds.length} 个测试用例从测试计划中删除`,
      });
    },
    [refreshDepData, testEntity?.objectId],
  );

  // table column 数据
  const tableColumns = useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.ItemKey, item => ({ item })),
      columnBuilder(BuiltinColumns.ItemTitle, item => ({ item })),
      {
        title: '执行任务数',
        key: 'execution',
        width: 90,
        render: (_, record) => {
          return record.relRuns?.runCount ?? 0;
        },
      },
      columnBuilder(BuiltinColumns.LatestStatus, record => {
        return {
          status: record.relRuns?.caseLatestStatus,
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
  }, [removeTestRelation]);

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
            const name = record.relExecutions?.[0]?.name;
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
        testType={TestType.Case}
        ignoreTestEntityIds={testEntityIds}
      />
      {/* 状态条的变化 */}
      <StatusProcessBar status={status} />

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
