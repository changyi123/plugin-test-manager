import React, { useRef, useCallback, useMemo, useState } from 'react';

import { DownOutlined } from '@ant-design/icons';
import { StatusProgress } from '@/components/business/Status';
import DropDownButton from '@/components/business/DropDownButton';
import { createRelations } from '@/lib/api/relations';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import { BuiltinColumns, columnBuilder } from '@/components/business/PanelTable';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { removeCaseLinkPlan } from '@/lib/api/common';
import { alert } from '@/lib/utils/helper';
import { TestType } from 'common/constant';
import cx from './index.less';
import { getItemByIQL } from '@/lib/api/proxima';
import { TestLinkType } from '@/lib/constants';
import { getStatsFormPlan } from '@/lib/api/item';

const Plan = () => {
  const { testEntity, setTestEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
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

  const fetchPlanList = useCallback(async () => {
    const planList = testEntity?.linkItems;
    if (!planList.length) return { list: [], total: 0 };
    // 获取测试计划
    const { items: list, count: total } = await getItemByIQL({ itemId: planList });
    // 获取统计数
    if (list?.length > 0) {
      const {
        data: { data: stats },
      } = await getStatsFormPlan({
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
  }, [testEntity?.linkItems]);

  // 更新列表数据
  const tableDataSourceGetter = useCallback(async () => {
    const { list, total } = await fetchPlanList();
    // 测试计划列表
    setPlanIds(list?.map(item => item.objectId));
    return {
      total,
      list,
    };
  }, [fetchPlanList]);

  // 添加测试计划菜单
  const testPlanMenuList = useMemo(() => {
    return [
      {
        title: '已存在的测试计划',
        async onClick() {
          const testPlanIds = await selectorModalRef.current.open();
          await createRelations({
            linkType: TestLinkType.CaseLinkPlan,
            targetItem: testEntity,
            link: testPlanIds,
          });

          alert({
            type: 'success',
            message: `当前测试用例添加到测试计划中`,
          });

          refreshDepData();
        },
      },
      {
        title: '新建测试计划',
        async onClick() {
          const { testEntity: testPlanEntity, item } = await createItemUseModal({
            type: TestType.Plan,
          });

          try {
            await createRelations({
              linkType: TestLinkType.CaseLinkPlan,
              targetItem: testEntity,
              link: [testPlanEntity.objectId],
            });
          } catch (err) {
            console.error(err);
          }

          refreshDepData();

          alert({
            type: 'success',
            message: `测试计划【${item.name}】新建成功`,
          });
        },
      },
    ];
  }, [createItemUseModal, refreshDepData, testEntity]);

  const removeTestRelation = useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;
      await removeCaseLinkPlan({ testPlan: relationTypeIds, testDetail: testEntity });

      refreshDepData();

      alert({
        type: 'success',
        message: '当前测试用例从测试计划中删除',
      });
    },
    [refreshDepData, testEntity],
  );

  // table column 数据
  const tableColumns = useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.ItemKey, item => ({
        item,
      })),
      columnBuilder(BuiltinColumns.ItemTitle, item => ({
        item,
      })),
      {
        title: '测试计划状态',
        key: 'status',
        width: 190,
        render(_, record) {
          // TODO：坐等StatusProgress完善
          // return <StatusProgress statuses={record.stats} hasSummary />;
        },
      },
      {
        title: '测试用例数',
        key: 'count',
        render(_, record) {
          return record.stats?.caseCount ?? 0;
        },
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        render: (_, record) => <a onClick={() => removeTestRelation([record.objectId])}>删除</a>,
      },
    ] as any[];
  }, [removeTestRelation]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title="添加当前用例至选中的测试计划中"
        actionRef={selectorModalRef}
        testType={TestType.Plan}
        ignoreTestEntityIds={planIds}
      />
      <PanelTable
        renderActions={() => (
          <DropDownButton menuList={testPlanMenuList}>
            添加至测试计划
            <DownOutlined />
          </DropDownButton>
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

export default React.memo(Plan);
