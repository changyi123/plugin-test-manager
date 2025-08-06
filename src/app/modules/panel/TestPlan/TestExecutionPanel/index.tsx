import { useMemoizedFn } from 'ahooks';
import { Button, message, notification } from 'antd';
import sum from 'lodash/sum';
import React, { useCallback, useMemo, useState } from 'react';

import {
  addExecutionToPlanWithProcess,
  removeExecutionFromPlanWithProcess,
} from '@/components/business/BatchResult/hooks';
import PanelTable, {
  ActionType,
  BuiltinColumns,
  columnBuilder,
} from '@/components/business/PanelTable';
import { StatusProgress } from '@/components/business/Status';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import { getLinkedTestEntityByQuery, getTestStats } from '@/lib/api/item';
import { BuiltinFieldNameMapping, CASESNAPSHOT_TYPE, TestLinkType, TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { alert, getTestManagerContainer } from '@/lib/utils/helper';

import cx from './index.less';

const EMPTY_ARRAY = [];

const Test = () => {
  const { t } = useI18n();
  const { testEntity, workspace, config } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();

  const testExecutionFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Execution,
    workspaceKey: workspace.key,
  });

  const [allTestEntities, setAllTestEntities] = useState([]);

  const allExecutionIds = useMemo(() => {
    return allTestEntities?.map(item => item.objectId) || EMPTY_ARRAY;
  }, [allTestEntities]);

  // 获取计划下的测试用例
  const getAllRelTestEntities = useCallback(
    async params => {
      const sourceIds = testEntity.objectId;
      if (!sourceIds || !config) return;
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
        const tasks = list.map(d =>
          getTestStats({
            groups: 'status',
            params: {
              query: {
                workspaceKey: workspace?.key,
                type: TestType.Run,
              },
              selector: [CASESNAPSHOT_TYPE.AUTO_BUILDVERSION].includes(config?.caseSnapshot?.type)
                ? `${BuiltinFieldNameMapping.referenceCaseSnapshot} is not null`
                : `${BuiltinFieldNameMapping.referenceCase} is not null`,
              linkType: TestLinkType.RunLinkExecution,
              sourceIds: [d.id],
              destinationType: TestType.Run,
              limit: 99999,
            } as any,
          }),
        );
        const stats = await Promise.all(tasks);
        // 组合数据
        list.forEach((item, index) => {
          item.stats = stats?.[index]?.reduce(
            (prev, cur) => ({
              ...prev,
              [cur.status]: cur.count,
            }),
            {},
          );
          item.runCount = sum(stats?.[index]?.map(d => d.count)) ?? 0;
        });
      }

      setAllTestEntities(list);

      return {
        list,
        total,
      };
    },
    [config?.caseSnapshot, testEntity.objectId, workspace?.key],
  );

  const refresh = React.useCallback(() => {
    tableActionRef.current.refresh();
  }, []);

  const tableDataSourceGetter = React.useCallback(
    params => getAllRelTestEntities(params),
    [getAllRelTestEntities],
  );

  // 创建测试执行
  const addExistedTestExecution = useMemoizedFn(async () => {
    const { selectedData: testExecutionIds } = await selectorModalRef.current.open({
      testType: TestType.Execution,
    });

    if (!testExecutionIds?.length) {
      return notification.warning({
        message: t('modules.panel.testPlan.testExecutionPanel.notSelectMessage'),
      });
    }

    try {
      // 将测试执行添加至测试计划中
      await addExecutionToPlanWithProcess({
        planId: testEntity?.objectId,
        executionIds: testExecutionIds,
        handleSuccess: () => {
          refresh();
          alert({
            type: 'success',
            message: `${testExecutionIds.length} ${t(
              'modules.panel.testPlan.testExecutionPanel.addRunToPlanSuccess',
            )}`,
          });
        },
        handleFail: error => {
          message.error(error.message);
        },
      });
    } catch (err) {
      message.error(err.message);
    }
  });

  const removeTestRelation = React.useCallback(
    async ids => {
      if (!Array.isArray(ids)) return;

      // 移除测试计划下的任务
      // @TODO update V2 remove execution from plan
      await removeExecutionFromPlanWithProcess({
        executionIds: ids,
        planId: testEntity.objectId,
        handleSuccess: () => {
          refresh();
          alert({
            type: 'success',
            message: `${ids.length} ${t(
              'modules.panel.testPlan.testExecutionPanel.deleteRunToPlanSuccess',
            )}`,
          });
        },
        handleFail: error => {
          message.error(error.message);
          refresh();
        },
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
          return record?.runCount ?? 0;
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
        tableFieldsKeys={testExecutionFieldKeys}
        width={800}
        getContainer={getTestManagerContainer}
      />

      <PanelTable
        renderActions={() => (
          <Button type="primary" onClick={addExistedTestExecution}>
            {t('modules.panel.testPlan.testExecutionPanel.addTestExecution')}
          </Button>
        )}
        actionRef={tableActionRef}
        allSelectableRowKeys={allExecutionIds}
        actionMenuList={[
          {
            key: 'delete',
            content: t('common.remove'),
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
