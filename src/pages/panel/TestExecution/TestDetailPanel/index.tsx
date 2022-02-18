import React from 'react';
import { Typography, message, Space, Button, Divider, Popconfirm } from '@osui/ui';
import { DownOutlined } from '@ant-design/icons';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import { toggleTestRunStatus, createTestRunAndRelation } from '@/lib/api/runs';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';
import TestRunModal from '@/components/panel/TestRunModal';
import { getRootContainer } from '@/lib/utils/helper';
import { StatusBadge } from '@/components/common/Status';
import { useAllRelTestEntities } from '@/lib/hooks/useTest';
import { INITIAL_STATUS_KEY } from '@/lib/constants';
import StatusProcessBar from '@/components/panel/StatusProcessBar';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();

  const selectorModalRef = React.useRef<SelectorActionType>();

  const { testEntities: allTestEntities, refresh: getAllRelTestEntities } = useAllRelTestEntities(
    TestRelationType.ExecutionRelRun,
    {
      from: testEntity,
    },
    ['runReferenceDetail', 'status'],
  );

  const { relTestDetailIds, relRunStatuses } = React.useMemo(() => {
    return {
      relTestDetailIds: allTestEntities.map(item => item.runReferenceDetail?.objectId),
      relRunStatuses: allTestEntities.map(item => item.status ?? INITIAL_STATUS_KEY),
    };
  }, [allTestEntities]);

  const refreshDepData = React.useCallback(() => {
    getAllRelTestEntities();
    tableActionRef.current.refresh();
  }, [getAllRelTestEntities]);

  const tableDataSourceGetter = React.useCallback(
    queryParams => {
      return getTestEntitiesByRelation(
        TestRelationType.ExecutionRelRun,
        { from: testEntity },
        {
          fillItemData: true,
          queryParams: queryParams,
          include: ['runReferenceDetail'],
        },
      );
    },
    [testEntity],
  );

  const removeTestRelation = React.useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;
      await removeTestRelations(relationTypeIds);

      refreshDepData();

      message.success('删除成功');
    },
    [refreshDepData],
  );

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
          const name = record?.reference?.name;

          return <Typography.Text ellipsis={{ tooltip: name }}>{name}</Typography.Text>;
        },
      },
      {
        title: '执行状态',
        dataIndex: 'status',
        key: 'status',
        render: (_, record) => {
          const handleStatusChange = async status => {
            await toggleTestRunStatus(record.objectId, status);
            refreshDepData();
          };
          return (
            <StatusBadge
              status={record?.status}
              useRootContainer
              onStatusChange={handleStatusChange}
            />
          );
        },
      },
      {
        title: '操作',
        key: 'testRunId',
        render: (value, item) => (
          <Space split={<Divider type="vertical" />} size={0} style={{ marginLeft: -4 }}>
            <TestRunModal
              testId={item.objectId}
              onCancel={() => setTimeout(() => refreshDepData(), 200)}
              trigger={
                <Button size="small" type="link">
                  执行
                </Button>
              }
            />
            <Popconfirm
              placement="left"
              getPopupContainer={() => getRootContainer()}
              title="当前操作会删除该测试执行，是否继续执行？"
              onConfirm={() => removeTestRelation([item.testRelationId])}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" type="link">
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [refreshDepData, removeTestRelation]);

  // 添加测试用例菜单
  const testDetailMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        async onClick() {
          const selectedTestDetailIds = await selectorModalRef.current.open({
            testType: TestType.TestDetail,
          });

          await createTestRunAndRelation(testEntity, selectedTestDetailIds);

          refreshDepData();
        },
      },
    ];
  }, [refreshDepData, testEntity]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title="添加测试用例到当前测试执行"
        ignoreTestEntityIds={relTestDetailIds}
      />

      <StatusProcessBar statuses={relRunStatuses} />

      <PanelTable
        renderActions={() => (
          <DropDownButton menuList={testDetailMenuList}>
            添加用例 <DownOutlined />
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

export default React.memo(Test);
