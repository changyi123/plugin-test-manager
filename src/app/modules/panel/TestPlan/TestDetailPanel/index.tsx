import React, { useCallback, useState, useMemo, useEffect } from 'react';

import { uniqueId } from 'lodash';
import { Button, Table, Tooltip } from 'antd';
import { alert } from '@/lib/utils/helper';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';
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
import StatusProcessBar from '@/components/business/StatusProcessBar';
import cx from './index.less';
import {
  batchCreateTestRun,
  getRunsFromCase,
  updateTestEntity,
  getLinkedTestEntityByQuery,
} from '@/lib/api/item';

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
  const getRelTestEntities = useCallback(
    async pages => {
      const sourceIds = testEntity.objectId;
      let stats = {};
      if (!sourceIds) return;
      // 获取计划下的所有测试用例
      const { list: caseList, total } = await getLinkedTestEntityByQuery({
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: testEntity?.objectId,
        destinationType: TestType.Case,
        workspaceKey: workspace?.key,
        ...pages,
      });
      if (caseList?.length) {
        // 测试用例关联测试执行
        stats = await getRunsFromCase({
          caseIds: caseList.map(item => item.id),
          planId: sourceIds,
          select: ['runCount', 'caseLatestStatus'],
        });
      }

      // 组装测试执行
      const list = caseList.map(detail => {
        return {
          ...detail,
          planId: testEntity.objectId,
          // 关联的测试执行
          relRuns: stats[detail.objectId] || {},
        };
      });

      return {
        list,
        total,
        stats,
      };
    },
    [testEntity.objectId, workspace?.key],
  );

  const getAllData = useCallback(async () => {
    const { list, stats } = await getRelTestEntities({
      offset: 0,
      limit: 9999,
      select: ['caseStatus', 'id'],
    });
    setAllTestEntities(list);
    setStats(stats);
  }, [getRelTestEntities]);

  // 组装所有状态
  const status = useMemo(() => {
    const status = {};
    allTestEntities.forEach(item => {
      const itemStatus = stats[item.id]?.caseLatestStatus || 'TODO';
      status[itemStatus] = (status[itemStatus] || 0) + 1;
    });
    return status;
  }, [allTestEntities, stats]);

  useEffect(() => {
    getAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { testEntityIds } = useMemo(() => {
    return {
      testEntityIds: allTestEntities.map(item => item.objectId),
      testEntityStatuses: allTestEntities.map(
        item => item.caseStatus?.[testEntity.objectId] ?? INITIAL_STATUS_KEY,
      ),
    };
  }, [allTestEntities, testEntity]);

  // 刷新依赖数据
  const refreshDepData = useCallback(() => {
    getAllData();
    tableActionRef.current?.refresh();
  }, [getAllData]);

  const tableDataSourceGetter = useCallback(
    async params => {
      const { list, total } = await getRelTestEntities(params);
      return { list, total };
    },
    [getRelTestEntities],
  );

  const createExcution = useCallback(
    async (caseIds, token) => {
      const res = await createItemUseModal({
        type: TestType.Execution,
        extraData: {
          token,
          planId: testEntity?.objectId,
          noBatch: true,
          modalProps: {
            title: `新建测试执行任务（已选 ${caseIds.length} 条用例）`,
          },
        },
      });

      return res;
    },
    [createItemUseModal, testEntity?.objectId],
  );

  // 创建测试执行
  const createTestExecution = useCallback(async () => {
    const caseIds = tableActionRef.current.selectedRowKeys;
    const token = uniqueId('TestPlan');
    const { item: testExecution } = await createExcution(caseIds, token);

    // 任务关联测试计划
    await updateTestEntity([
      {
        linkType: TestLinkType.ExecutionLinkPlan,
        objectId: testExecution?.objectId,
        linkItems: { action: 'add', value: [testEntity.objectId] },
      },
    ]);

    // 规划用例创建测试执行
    if (caseIds?.length) {
      await batchCreateTestRun({
        executionId: testExecution.objectId,
        caseIds,
      });
    }

    alert({
      type: 'success',
      message: `测试执行任务【${testExecution?.name}】新建成功`,
    });
  }, [createExcution, testEntity.objectId, tableActionRef]);

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
          const { testEntityList } = await createItemUseModal({
            hideMessage: true,
            type: TestType.Case,
            extraData: {
              useItemBatchCreate: true,
              folderKey: null,
            },
          });

          if (!testEntityList.length) return;
          await updateTestEntity(
            testEntityList.map(d => ({
              linkType: TestLinkType.CaseLinkPlan,
              objectId: d.objectId,
              linkItems: { action: 'add', value: [testEntity.objectId] },
            })),
          );

          refreshDepData();

          const successMessage =
            testEntityList.length > 1
              ? `${testEntityList.length}个测试用例已被添加到测试计划中`
              : `测试用例【${testEntityList[0]?.name}】已被添加到测试计划中`;

          alert({
            type: 'success',
            message: successMessage,
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

  const createTestExcution = useCallback(async () => {
    await createTestExecution();
    refreshDepData();
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
            <Button icon={<PlusOutlined />} onClick={createTestExcution}>
              测试执行任务
            </Button>
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
