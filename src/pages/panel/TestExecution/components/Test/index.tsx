import React from 'react';

import { Typography, message, Space, Button } from '@osui/ui';
import { EllipsisOutlined, DownOutlined } from '@ant-design/icons';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '../../../../../components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import TestTableStatus from '@/pages/run/components/TestTableStatus';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();

  const selectorModalRef = React.useRef<SelectorActionType>();

  const tableDataSourceGetter = React.useCallback(
    queryParams => {
      return getTestEntitiesByRelation(
        TestRelationType.ExecutionRelRun,
        { from: testEntity },
        { fillItemData: true, queryParams: queryParams, include: ['runReferenceDetail'] },
      );
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
      //   title: '最新执行状态',
      //   dataIndex: 'status',
      //   key: 'status',
      //   render: value => {
      //     return <TestTableStatus readonly status={value ?? 'todo'} testId="" />;
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

  // 添加测试用例菜单
  const testDetailMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        onClick() {
          selectorModalRef.current.open({
            testType: TestType.TestDetail,
          });
        },
      },
    ];
  }, []);

  // 添加测试用例添加到测试执行
  const addTestDetailToPlan = React.useCallback(
    async testDetailIds => {
      // await addTestDetailToPlanService({
      //   testPlan: testEntity,
      //   testDetailIds,
      // });

      console.log('testEntity', testEntity);
      console.log('testDetailIds', testDetailIds);

      tableActionRef.current.refresh();
    },
    [testEntity],
  );

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title="添加测试用例到当前测试计划"
        onSelect={addTestDetailToPlan}
        actionRef={selectorModalRef}
      />
      <Space>
        <Button type="primary">新增测试用例</Button>
        <DropDownButton menuList={testDetailMenuList}>
          添加测试用例 <DownOutlined />
        </DropDownButton>
      </Space>
      <PanelTable
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
