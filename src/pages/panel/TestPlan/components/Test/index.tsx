import React from 'react';

import { uniqueId } from 'lodash';
import { Workspace } from '@/lib/types/App';
import { Typography, message } from '@osui/ui';
import { EllipsisOutlined } from '@ant-design/icons';
import { createTestExecutionService } from './services';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '../../../PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import TestTableStatus from '@/pages/run/components/TestTableStatus';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();

  const tableDataSourceGetter = React.useCallback(
    queryParams => {
      return getTestEntitiesByRelation(
        TestRelationType.PlanRelDetail,
        { from: testEntity },
        { fillItemData: true, queryParams: queryParams },
      );
    },
    [testEntity],
  );

  // 创建测试执行
  const createTestExecution = React.useCallback(async () => {
    const token = uniqueId('TestPlan');
    const res = await createItemUseModal({
      extraData: { token },
      // TODO: 测试执行 name
      name: uniqueId('测试执行'),
      type: TestType.TestExecution,
    });

    const { testEntity: testExecutionEntity, extraData } = res;
    // token 不相同则不创建关联
    if (extraData.token !== token) return;

    const testExecutionData = testExecutionEntity.toJSON();

    const testExecution = await createTestExecutionService({
      testPlan: testEntity,
      testExecution: testExecutionEntity,
      workspaceKey: (testExecutionData.reference.workspace as Workspace).key,
    });

    console.info('testExecution', testExecution);
  }, [createItemUseModal, testEntity]);

  // 添加测试用例菜单
  const testDetailMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        onClick() {},
      },
    ];
  }, []);

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
      {
        title: '最新执行状态',
        dataIndex: 'status',
        key: 'status',
        render: value => {
          return <TestTableStatus readonly status={value ?? 'todo'} />;
        },
      },
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

  // 添加测试执行菜单
  const testExecutionMenuList = React.useMemo(() => {
    return [
      {
        title: '所有测试用例',
        onClick: createTestExecution,
      },
    ];
  }, [createTestExecution]);

  return (
    <div className={cx('test')}>
      <DropDownButton menuList={testDetailMenuList}>添加测试用例</DropDownButton>
      <DropDownButton buttonProps={{ className: cx('btn-right') }} menuList={testExecutionMenuList}>
        创建测试执行
      </DropDownButton>
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
