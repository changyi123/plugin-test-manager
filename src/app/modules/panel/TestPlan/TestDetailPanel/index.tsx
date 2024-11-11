import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { Button, message } from 'antd';
import { uniqueId } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import DropDownButton from '@/components/business/DropDownButton';
import PanelTable, {
  ActionType,
  BuiltinColumns,
  columnBuilder,
} from '@/components/business/PanelTable';
// import { StatusBadge } from '@/components/business/Status';
import StatusProcessBar from '@/components/business/StatusProcessBar';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import {
  batchCreateTestRun,
  getLinkedTestEntityByQuery,
  getRunsFromCase,
  updateTestEntity,
} from '@/lib/api/item';
import { getAppEnv } from '@/lib/appEnv';
import { INITIAL_STATUS_KEY, TestLinkType, TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { alert, getTestManagerContainer } from '@/lib/utils/helper';

const Test = () => {
  const { t } = useI18n();
  const { testEntity, workspace, config } = useTestConfig();
  const { statusList, listType } = config;
  const { createItemUseModal, getCreatePermission } = useBaseAction();
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
      testEntityIds: allTestEntities.map(item => item.id),
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

  const createExecution = useCallback(
    async (caseIds, token) => {
      const defaultNameConfig = getAppEnv('CREATE_EXECUTION_DEFAULT_NAME_CONFIG');
      const enable = defaultNameConfig?.enable;
      const suffixName = defaultNameConfig?.suffixName;

      const config = enable ? { name: `${testEntity?.name}_${suffixName}` } : {};

      const res = await createItemUseModal({
        type: TestType.Execution,
        extraData: {
          token,
          planId: testEntity?.objectId,
          isDisableCreateNext: true,
          modalProps: {
            title: `${t('modules.panel.testPlan.testDetailPanel.modelTitle.0')} ${
              caseIds.length
            } ${t('modules.panel.testPlan.testDetailPanel.modelTitle.1')}`,
          },
        },
        ...config,
      });

      return res;
    },
    [testEntity?.name, testEntity?.objectId, createItemUseModal, t],
  );

  // 创建测试执行
  const createTestExecution = useCallback(async () => {
    const caseIds = tableActionRef.current.selectedRowKeys;
    const token = uniqueId('TestPlan');
    const { item: testExecution } = await createExecution(caseIds, token);

    // 任务关联测试计划
    const res = await updateTestEntity([
      {
        linkType: TestLinkType.ExecutionLinkPlan,
        objectId: testExecution?.objectId,
        linkItems: { action: 'add', value: [testEntity.objectId] },
      },
    ]);
    if (res?.status === 'error') {
      message.error(res.data);
      return;
    }

    // 规划用例创建测试执行
    if (caseIds?.length) {
      await batchCreateTestRun({
        executionId: testExecution.objectId,
        caseIds,
      });
    }

    alert({
      type: 'success',
      message: `${t('common.testExecution')}【${testExecution?.name}】${t('common.addSuccess')}`,
    });
  }, [createExecution, testEntity.objectId, tableActionRef, t]);

  const existStartNode = useMemo(() => statusList?.find(s => s.isStartStatus), [statusList]);
  const enableCreateCase = useMemo(() => {
    return listType === 'black' ? !existStartNode : statusList?.length && existStartNode;
  }, [listType, existStartNode, statusList?.length]);

  // 添加测试用例菜单
  const testDetailMenuList = useMemo(() => {
    return [
      {
        title: t('modules.panel.testExecution.testDetailPanel.existingTestCase'),
        async onClick() {
          const testDetailIds = await selectorModalRef.current.open();
          if (getCreatePermission(TestType.Case)) {
            message.error(t('page.plan.testEntityList.addItemTips'));
            return;
          }
          const _testDetailIds = testDetailIds.filter(d => !(testEntityIds ?? []).includes(d));

          const res = await updateTestEntity(
            _testDetailIds.map(objectId => ({
              linkType: TestLinkType.CaseLinkPlan,
              objectId,
              linkItems: { action: 'add', value: [testEntity.objectId] },
            })),
          );
          if (res?.status === 'error') {
            message.error(res.data);
            return;
          }

          refreshDepData();

          alert({
            type: 'success',
            message: `${_testDetailIds.length} ${t(
              'modules.panel.testPlan.testDetailPanel.addCaseToPlanSuccess',
            )}`,
          });
        },
      },
      {
        title: t('common.addTestCase'),
        disabled: getCreatePermission(TestType.Case) || !enableCreateCase,
        extraTitle: enableCreateCase
          ? t('common.addTestCase')
          : t('common.casePlanRule', { statusName: existStartNode?.name }),
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
          const res = await updateTestEntity(
            testEntityList.map(d => ({
              linkType: TestLinkType.CaseLinkPlan,
              objectId: d.objectId,
              linkItems: { action: 'add', value: [testEntity.objectId] },
            })),
          );
          if (res?.status === 'error') {
            message.error(res.data);
            return;
          }

          refreshDepData();
          const proxima = createProximaSdk();
          proxima.execute('updateRepoTree');

          const successMessage =
            testEntityList.length > 1
              ? `${testEntityList.length}${t(
                  'modules.panel.testPlan.testDetailPanel.addCaseToPlanSuccessTips.0',
                )}`
              : `${t('modules.panel.testPlan.testDetailPanel.addCaseToPlanSuccessTips.1')}【${
                  testEntityList[0]?.name
                }】${t('modules.panel.testPlan.testDetailPanel.addCaseToPlanSuccessTips.0')}`;

          alert({
            type: 'success',
            message: successMessage,
          });
        },
      },
    ];
  }, [createItemUseModal, refreshDepData, getCreatePermission, testEntity, testEntityIds, t]);

  const removeTestRelation = useCallback(
    async testDetailIds => {
      if (!Array.isArray(testDetailIds)) return;
      // 移除测试用例和计划的关联
      const res = await updateTestEntity(
        testDetailIds.map(objectId => ({
          objectId,
          linkItems: { action: 'delete', value: [testEntity.objectId] },
        })),
      );
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }

      refreshDepData();

      alert({
        type: 'success',
        message: `${testDetailIds.length} ${t(
          'modules.panel.testPlan.testDetailPanel.removeCaseFromPlanSuccess',
        )}`,
      });
    },
    [refreshDepData, testEntity?.objectId, t],
  );

  // table column 数据
  const tableColumns = useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.getItemKey(t), item => ({ item })),
      columnBuilder(BuiltinColumns.getItemTitle(t), item => ({ item })),
      {
        title: t('modules.panel.testPlan.testDetailPanel.executionCount'),
        key: 'execution',
        render: (_, record) => {
          return record.relRuns?.runCount ?? 0;
        },
      },
      columnBuilder(BuiltinColumns.getLatestStatus(t), record => {
        return {
          status: record.relRuns?.caseLatestStatus,
          readonly: true,
        };
      }),
      {
        title: t('common.action'),
        key: 'action',
        align: 'center' as any,
        fixed: 'right' as any,
        width: 90,
        render: (_, record) => (
          <>
            <a onClick={() => removeTestRelation([record.objectId])}>{t('common.remove')}</a>
          </>
        ),
      },
    ];
  }, [removeTestRelation, t]);

  const onClick = useCallback(async () => {
    await createTestExecution();
    refreshDepData();
  }, [createTestExecution, refreshDepData]);

  // const expandedRowRender = useCallback(
  //   record => {
  //     // 测试执行序列
  //     const testIdSequence = record.relRuns?.map(item => item?.objectId).filter(Boolean);

  //     const columns = [
  //       {
  //         key: 'execution',
  //         title: (
  //           <span>
  //             <Tooltip title={t('modules.panel.testPlan.testDetailPanel.executionTips')}>
  //               {t('common.testExecution')}
  //               <QuestionCircleOutlined style={{ marginLeft: 8 }} />
  //             </Tooltip>
  //           </span>
  //         ),
  //         width: 160,
  //         tooltip: true,
  //         render(_, record) {
  //           const name = record.relExecutions?.[0]?.name;
  //           return <OverflowTooltip title={name}>{name}</OverflowTooltip>;
  //         },
  //       },
  //       {
  //         key: 'status',
  //         title: t('page.plan.testEntityList.runStatus'),
  //         width: 150,
  //         render(_, record) {
  //           return <StatusBadge status={record.status} readonly />;
  //         },
  //       },
  //       {
  //         key: 'action',
  //         title: t('common.action'),
  //         width: 120,
  //         render(_, record) {
  //           return (
  //             <a
  //               onClick={async () => {
  //                 await testRunModalActionRef.current.open({
  //                   testId: record.objectId,
  //                   testIdSequence,
  //                 });
  //                 refreshDepData(); //刷新依赖数据
  //               }}
  //             >
  //               {t('common.run')}
  //             </a>
  //           );
  //         },
  //       },
  //     ];
  //     return (
  //       <Table
  //         scroll={{
  //           x: 'max-content',
  //         }}
  //         pagination={false}
  //         rowKey="objectId"
  //         columns={columns}
  //         className={cx('inner-table')}
  //         dataSource={record.relRuns}
  //       />
  //     );
  //   },
  //   [refreshDepData, t],
  // );

  return (
    <div>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title={t('modules.panel.testPlan.testDetailPanel.selectCaseModelTitle')}
        testType={TestType.Case}
        ignoreTestEntityIds={testEntityIds}
        getContainer={getTestManagerContainer}
      />
      {/* 状态条的变化 */}
      <StatusProcessBar status={status} />

      <PanelTable
        renderActions={() => (
          <>
            <Button
              icon={<PlusOutlined />}
              disabled={getCreatePermission(TestType.Execution)}
              onClick={onClick}
            >
              {t('common.testExecution')}
            </Button>
            <DropDownButton menuList={testDetailMenuList}>
              {t('modules.panel.testPlan.testDetailPanel.addTestCase')} <DownOutlined />
            </DropDownButton>
          </>
        )}
        actionRef={tableActionRef}
        allSelectableRowKeys={testEntityIds}
        actionMenuList={[
          {
            key: 'delete',
            content: t('common.delete'),
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
