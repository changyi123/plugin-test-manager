import React, { useRef, useCallback, useMemo, useState } from 'react';

import { DownOutlined } from '@ant-design/icons';
import { StatusProgress } from '@/components/business/Status';
import DropDownButton from '@/components/business/DropDownButton';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import { BuiltinColumns, columnBuilder } from '@/components/business/PanelTable';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { alert } from '@/lib/utils/helper';
import { TestType } from 'common/constant';
import cx from './index.less';
import { getItemByIQL } from '@/lib/api/proxima';
import { TestLinkType } from '@/lib/constants';
import {
  getStatsFormPlan,
  updateTestEntity as updateRelated,
  getLinkedTestEntityByQuery,
} from '@/lib/api/item';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { message } from 'antd';
import useI18n from '@/lib/hooks/useI18n';

const Plan = () => {
  const { t } = useI18n();
  const { testEntity, workspace, setTestEntity } = useTestConfig();
  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const tableActionRef = useRef<ActionType>();
  const selectorModalRef = useRef<SelectorActionType>();

  const [planIds, setPlanIds] = useState([]);

  // 更新provider
  const updateTestEntity = useCallback(async () => {
    const {
      items: [data],
    } = await getItemByIQL({ itemId: testEntity.objectId });
    setTestEntity(data);
  }, [setTestEntity, testEntity.objectId]);

  // 刷新数据
  const refreshDepData = useCallback(async () => {
    await updateTestEntity();
    tableActionRef.current.refresh();
  }, [updateTestEntity]);

  // 更新测试用例-计划关联关系，并触发外部列表更新
  const updateRelatedAndRefresh = useCallback(async data => {
    const res = await updateRelated(data);
    if (res?.status === 'error') {
      message.error(res.data);
      return;
    }
    const proxima = createProximaSdk();
    proxima.execute('updateRepoTree');
    return res;
  }, []);

  const fetchPlanList = useCallback(
    async params => {
      const planList = testEntity?.linkItems;

      if (!planList?.length) return { list: [], total: 0 };
      // 获取测试计划
      const { list, total } = await getLinkedTestEntityByQuery({
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: testEntity?.objectId,
        destinationType: TestType.Plan,
        workspaceKey: workspace?.key,
        ...params,
      });

      // 获取统计数
      if (list?.length > 0) {
        const stats = await getStatsFormPlan({
          planIds: list.map(item => item.objectId),
          select: ['caseStatus', 'caseCount'],
        });
        // 组装统计数
        Object.keys(stats).forEach(id => {
          const target = list.find(item => item.objectId === id);
          if (!target) return;
          target.stats = stats[id];
        });
      }
      return { list, total };
      // 获取统计数量
    },
    [testEntity?.linkItems, testEntity?.objectId, workspace?.key],
  );

  // 更新列表数据
  const tableDataSourceGetter = useCallback(
    async params => {
      const { list, total } = await fetchPlanList(params);
      // 测试计划列表
      setPlanIds(list?.map(item => item.objectId));
      return {
        total,
        list,
      };
    },
    [fetchPlanList],
  );

  // 添加测试计划菜单
  const testPlanMenuList = useMemo(() => {
    return [
      {
        title: t('modules.panel.testDetail.testPlanPanel.menuList.0'),
        async onClick() {
          const testPlanIds = await selectorModalRef.current.open();

          const res = await updateRelatedAndRefresh([
            {
              linkType: TestLinkType.CaseLinkPlan,
              objectId: testEntity.objectId,
              linkItems: { action: 'add', value: testPlanIds },
            },
          ]);
          if (!res) return;

          alert({
            type: 'success',
            message: t('modules.panel.testDetail.testPlanPanel.addCaseSuccessMessage'),
          });

          refreshDepData();
        },
      },
      {
        title: t('modules.panel.testDetail.testPlanPanel.menuList.1'),
        disabled: getCreatePermission(TestType.Plan),
        async onClick() {
          const { item } = await createItemUseModal({
            type: TestType.Plan,
            extraData: {
              isDisableCreateNext: true,
            },
          });

          try {
            await updateRelatedAndRefresh([
              {
                linkType: TestLinkType.CaseLinkPlan,
                objectId: testEntity.objectId,
                linkItems: { action: 'add', value: [item.objectId] },
              },
            ]);
          } catch (err) {
            console.error(err);
          }

          refreshDepData();

          alert({
            type: 'success',
            message: `${t('modules.panel.testDetail.testPlanPanel.addPlanSuccessMessage.0')}【${
              item.name
            }】${t('modules.panel.testDetail.testPlanPanel.addPlanSuccessMessage.1')}`,
          });
        },
      },
    ];
  }, [
    createItemUseModal,
    refreshDepData,
    getCreatePermission,
    testEntity.objectId,
    updateRelatedAndRefresh,
    t,
  ]);

  const removeTestRelation = useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;
      const res = await updateRelatedAndRefresh([
        {
          linkType: TestLinkType.CaseLinkPlan,
          objectId: testEntity.objectId,
          linkItems: { action: 'delete', value: relationTypeIds },
        },
      ]);
      if (!res) return;

      refreshDepData();

      alert({
        type: 'success',
        message: t('modules.panel.testDetail.testPlanPanel.deleteCaseSuccessMessage'),
      });
    },
    [refreshDepData, testEntity.objectId, updateRelatedAndRefresh, t],
  );

  // table column 数据
  const tableColumns = useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.getItemKey(t), item => ({
        item,
      })),
      columnBuilder(BuiltinColumns.getItemTitle(t), item => ({
        item,
      })),
      {
        title: t('modules.panel.testDetail.testPlanPanel.planStatus'),
        key: 'status',
        width: 190,
        render(_, record) {
          return <StatusProgress status={record.stats?.caseStatus} hasSummary />;
        },
      },
      {
        title: t('modules.panel.testDetail.testPlanPanel.planCount'),
        key: 'count',
        render(_, record) {
          return record.stats?.caseCount ?? 0;
        },
      },
      {
        title: t('common.action'),
        key: 'action',
        fixed: 'right',
        render: (_, record) => (
          <a onClick={() => removeTestRelation([record.objectId])}>{t('common.delete')}</a>
        ),
      },
    ] as any[];
  }, [removeTestRelation, t]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title={t('modules.panel.testDetail.testPlanPanel.modelTitle')}
        actionRef={selectorModalRef}
        testType={TestType.Plan}
        ignoreTestEntityIds={planIds}
      />
      <PanelTable
        renderActions={() => (
          <DropDownButton menuList={testPlanMenuList}>
            {t('modules.panel.testDetail.testPlanPanel.dropButton')}
            <DownOutlined />
          </DropDownButton>
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

export default React.memo(Plan);
