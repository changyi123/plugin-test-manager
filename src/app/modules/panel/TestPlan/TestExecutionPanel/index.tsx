import React, { useCallback, useState } from 'react';

import { Button, message } from 'antd';
import { useTestConfig } from '@/lib/hooks/useContext';
import { TestLinkType, TestType } from '@/lib/constants';
import PanelTable, {
  ActionType,
  columnBuilder,
  BuiltinColumns,
} from '@/components/business/PanelTable';
import { alert, generateSortIndex } from '@/lib/utils/helper';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { StatusProgress } from '@/components/business/Status';
import { updateTestEntity, getLinkedTestEntityByQuery, getTestStats } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import cx from './index.less';

const Test = () => {
  const { t } = useI18n();
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
      const { list, total } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspace?.key,
        },
        linkType: TestLinkType.ExecutionLinkPlan,
        sourceIds: testEntity?.objectId,
        destinationType: TestType.Execution,
        ...params,
      });

      if (list?.length) {
        const stats = await getTestStats({
          groups: 'status',
          params: {
            query: {
              workspaceKey: workspace?.key,
              type: TestType.Run,
            },
            linkType: TestLinkType.RunLinkExecution,
            sourceIds: [testEntity?.objectId],
            destinationType: TestType.Run,
            limit: 99999,
          } as any,
        });
        // 组合数据
        list.forEach(item => {
          item.stats = stats.reduce(
            (prev, cur) => ({
              ...prev,
              [cur.status]: cur.count,
            }),
            {},
          );
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

  const addTestExecutionToPlan = React.useCallback(
    async executionIds => {
      // 测试计划关联测试执行后需将测试执行任务中的测试执行对应的测试用例关联到测试计划中
      const res = await updateTestEntity(
        executionIds.map(objectId => ({
          objectId,
          linkType: TestLinkType.ExecutionLinkPlan,
          type: TestType.Execution,
          linkItems: { action: 'add', value: [testEntity?.objectId] },
          sortIndex: generateSortIndex(),
        })),
      );
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }

      const { list: caseLinkPlanIds } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspace?.key,
        },
        limit: 9999,
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [testEntity?.objectId],
        destinationType: TestType.Case,
        onlySelectId: true,
      });

      const { list: runs } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspace?.key,
        },
        limit: 9999,
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: executionIds,
        destinationType: TestType.Run,
        select: ['id', 'referenceCase'],
      });

      const runCaseIds = runs?.map(run => run.referenceCase) ?? [];
      const caseIds = runCaseIds.filter(id => !caseLinkPlanIds.includes(id));

      if (caseIds.length) {
        const res = await updateTestEntity(
          caseIds.map(item => ({
            objectId: item,
            linkType: TestLinkType.CaseLinkPlan,
            linkItems: {
              action: 'add',
              value: [testEntity.objectId],
            },
          })),
        );
        if (res?.status === 'error') {
          message.error(res.data);
          return;
        }
      }
      refresh();
      alert({
        type: 'success',
        message: `${executionIds.length} ${t(
          'modules.panel.testPlan.testExecutionPanel.addRunToPlanSuccess',
        )}`,
      });
    },
    [refresh, testEntity?.objectId, workspace, t],
  );

  // 创建测试执行
  const addExistedTestExecution = React.useCallback(async () => {
    const ids = await selectorModalRef.current.open({
      testType: TestType.Execution,
    });

    await addTestExecutionToPlan(ids);
  }, [addTestExecutionToPlan]);

  const removeTestRelation = React.useCallback(
    async ids => {
      if (!Array.isArray(ids)) return;

      // 移除测试计划下的任务
      const res = await updateTestEntity(
        ids.map(objectId => ({
          objectId,
          linkItems: { action: 'delete', value: [testEntity.objectId] },
        })),
      );
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }
      refresh();
      alert({
        type: 'success',
        message: `${ids.length} ${t(
          'modules.panel.testPlan.testExecutionPanel.deleteRunToPlanSuccess',
        )}`,
      });
    },
    [refresh, testEntity.objectId, t],
  );

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.getItemKey(t), record => ({ item: record })),
      columnBuilder(BuiltinColumns.getItemTitle(t), record => ({ item: record })),
      {
        title: t('modules.panel.testDetail.testPlanPanel.planCount'),
        key: 'count',
        render(_, record) {
          return record.stats?.runCount;
        },
      },
      {
        title: t('common.status'),
        key: 'status',
        dataIndex: 'status',
        width: 180,
        render: (_, record) => {
          return <StatusProgress hasSummary status={record.stats} />;
        },
      },
      {
        title: t('common.action'),
        width: 120,
        key: 'action',
        render: (_, record) => (
          <a onClick={() => removeTestRelation([record.objectId])}>{t('common.remove')}</a>
        ),
      },
    ];
  }, [removeTestRelation, t]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title={t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
        ignoreTestEntityIds={allTestEntities?.map(item => item.objectId)}
        width={800}
      />

      <PanelTable
        renderActions={() => (
          <Button type="primary" onClick={addExistedTestExecution}>
            {t('modules.panel.testPlan.testExecutionPanel.addTestExecution')}
          </Button>
        )}
        actionRef={tableActionRef}
        actionMenuList={[
          {
            title: t('common.delete'),
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
