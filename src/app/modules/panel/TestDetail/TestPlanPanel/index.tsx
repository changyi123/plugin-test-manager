import React, { useRef, useCallback, useMemo, useState } from 'react';

import { DownOutlined } from '@ant-design/icons';
import { StatusProgress } from '@/components/business/Status';
import { TestType } from '@/lib/constants';
import DropDownButton from '@/components/business/DropDownButton';
import { createTestDetailToPlanRelations } from '@/lib/api/relations';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import { BuiltinColumns, columnBuilder } from '@/components/business/PanelTable';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { removeCaseLinkPlan, fetchLinkList } from '@/lib/api/common';
import { alert } from '@/lib/utils/helper';
import { TestLinkType } from 'common/constant';
import cx from './index.less';

const Plan = () => {
  const { testEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = useRef<ActionType>();
  const selectorModalRef = useRef<SelectorActionType>();

  const [planIds, setPlanIds] = useState();

  // 刷新数据
  const refreshDepData = useCallback(() => {
    tableActionRef.current.refresh();
  }, []);

  const fetchPlanList = useCallback(async () => {
    // 获取测试用例关联的测试计划
    const { status, data } = await fetchLinkList({
      linkItems: testEntity.objectId,
      linkType: TestLinkType.CaseLinkPlan,
    });
    if (status !== 'ok') {
      // 报错
      throw new Error('fetch link list error');
    }
    return data;
    // 获取统计数量
  }, [testEntity.objectId]);

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
          await createTestDetailToPlanRelations({
            testDetail: testEntity,
            testPlan: testPlanIds,
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
            type: TestType.TestPlan,
          });

          try {
            await createTestDetailToPlanRelations({
              testDetail: testEntity,
              testPlan: [testPlanEntity.objectId],
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
      columnBuilder(BuiltinColumns.ItemKey, data => ({
        item: data.reference,
      })),
      columnBuilder(BuiltinColumns.ItemTitle, data => ({
        item: data.reference,
      })),
      {
        title: '测试计划状态',
        key: 'status',
        width: 190,
        render(_, record) {
          const detailStatuses = record.relTestDetails.map(
            item => item.detailStatus?.[record.objectId],
          );
          return <StatusProgress statuses={detailStatuses} hasSummary />;
        },
      },
      {
        title: '测试用例数',
        key: 'count',
        render(_, record) {
          return record.relTestDetails?.length ?? 0;
        },
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        render: (_, record) => (
          <a
            onClick={() =>
              removeCaseLinkPlan({ testPlan: [record.testRelationId], testDetail: testEntity })
            }
          >
            删除
          </a>
        ),
      },
    ] as any[];
  }, [testEntity]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title="添加当前用例至选中的测试计划中"
        actionRef={selectorModalRef}
        testType={TestType.TestPlan}
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
        rowKey="testRelationId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
      />
    </div>
  );
};

export default React.memo(Plan);
