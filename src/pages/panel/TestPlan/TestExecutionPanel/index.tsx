import React from 'react';

import { Typography, message, Button } from '@osui/ui';
import { EllipsisOutlined } from '@ant-design/icons';
import { useTestConfig } from '@/lib/hooks/useContext';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';
import { addTestExecutionToPlanService } from './service';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();
  const selectorModalRef = React.useRef<SelectorActionType>();

  const tableDataSourceGetter = React.useCallback(
    queryParams => {
      return getTestEntitiesByRelation(
        TestRelationType.PlanRelExecution,
        { from: testEntity },
        { fillItemData: true, queryParams: queryParams },
      );
    },
    [testEntity],
  );

  // 创建测试执行
  const addExistedTestExecution = React.useCallback(async () => {
    selectorModalRef.current.open({
      testType: TestType.TestExecution,
    });
  }, []);

  const addTestExecutionToPlan = React.useCallback(
    async testExecutionIds => {
      await addTestExecutionToPlanService({
        testPlan: testEntity,
        testExecutionIds,
      });

      tableActionRef.current.refresh();
    },
    [testEntity],
  );

  const removeTestRelation = React.useCallback(async relationTypeIds => {
    if (!Array.isArray(relationTypeIds)) return;
    await removeTestRelations(relationTypeIds);

    tableActionRef.current.refresh();

    message.success('删除成功');
  }, []);

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      {
        title: '事项key',
        key: 'reference.name',
        width: 100,
        render(_, record) {
          const item = record?.reference;
          return (
            <Typography.Link
              ellipsis={true}
              target="_blank"
              href={`/osc/workspaces/${item?.workspace?.key}/item/${item?.key}`}
            >
              {item?.key}
            </Typography.Link>
          );
        },
      },
      {
        title: '事项名',
        key: 'reference.name',
        render(_, record) {
          const item = record?.reference;

          return <Typography.Text ellipsis={{ tooltip: item?.name }}>{item?.name}</Typography.Text>;
        },
      },
      // {
      //   title: '状态',
      //   dataIndex: 'status',
      //   key: 'status',
      //   render: value => {
      //     return 'TODO: status';
      //     // return <TestTableStatus readonly status={value ?? 'todo'} />;
      //   },
      // },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <DropDownButton
            buttonProps={{ type: 'text' }}
            menuList={[
              {
                title: '删除',
                onClick() {
                  removeTestRelation([record.testRelationId]);
                },
              },
            ]}
          >
            <EllipsisOutlined />
          </DropDownButton>
        ),
      },
    ];
  }, [removeTestRelation]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title="添加测试执行至当前测试计划"
        actionRef={selectorModalRef}
        onSelect={addTestExecutionToPlan}
      />

      <PanelTable
        renderActions={() => (
          <Button type="primary" onClick={addExistedTestExecution}>
            添加测试执行
          </Button>
        )}
        actionRef={tableActionRef}
        actionMenuList={[
          {
            title: '删除',
            onClick(rows) {
              removeTestRelation(rows.map(row => row.testRelationId));
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
