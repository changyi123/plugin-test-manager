import React from 'react';
import { Typography, message, Space, Button, Divider, Popconfirm } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import DropDownButton from '@/components/business/DropDownButton';
import { toggleTestRunStatus, createTestRunAndRelation } from '@/lib/api/runs';
import { useTestConfig } from '@/lib/hooks/useContext';
import {
  removeTestRelationsWithCondition,
  getTestEntitiesByRelationWithOrder,
} from '@/lib/api/common';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { getRootContainer, goToItemDetailPage } from '@/lib/utils/helper';
import { StatusBadge } from '@/components/business/Status';
import { useAllRelTestEntities } from '@/lib/hooks/useTest';
import { INITIAL_STATUS_KEY } from '@/lib/constants';
import StatusProcessBar from '@/components/business/StatusProcessBar';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();

  const selectorModalRef = React.useRef<SelectorActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();

  const { testEntities: allTestEntities, refresh: getAllRelTestEntities } = useAllRelTestEntities(
    TestRelationType.ExecutionRelRun,
    {
      from: testEntity,
    },
    {
      include: ['runReferenceDetail', 'status'],
    },
  );

  // 所有的测试执行
  const allTestRunIds = React.useMemo(
    () => allTestEntities.map(entity => entity.objectId),
    [allTestEntities],
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
      return getTestEntitiesByRelationWithOrder(
        TestRelationType.ExecutionRelRun,
        { from: testEntity },
        {
          queryParams: queryParams,
          select: ['status', 'sortIndex', 'runReferenceDetail'],
          include: ['status', 'sortIndex', 'runReferenceDetail.reference'],
        },
      );
    },
    [testEntity],
  );

  const removeTestRelation = React.useCallback(
    async testRunIds => {
      if (!Array.isArray(testRunIds)) return;
      await removeTestRelationsWithCondition(TestRelationType.ExecutionRelRun, {
        from: testEntity,
        to: testRunIds,
      });

      refreshDepData();

      message.success('删除成功');
    },
    [refreshDepData, testEntity],
  );

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      {
        title: '事项key',
        key: 'key',
        width: 100,
        render(_, record) {
          const item = record?.runReferenceDetail?.reference;
          return (
            <Typography.Link
              ellipsis={true}
              target="_blank"
              onClick={() =>
                goToItemDetailPage({
                  workspaceKey: item?.workspace?.key,
                  itemKey: item?.key,
                })
              }
            >
              {item?.key}
            </Typography.Link>
          );
        },
      },
      {
        title: '事项名',
        key: 'name',
        render(_, record) {
          const name = record?.runReferenceDetail?.reference?.name;

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
        render: (_, item) => (
          <Space split={<Divider type="vertical" />} size={0} style={{ marginLeft: -4 }}>
            <Button
              onClick={async () => {
                await testRunModalActionRef.current.open({
                  testId: item.objectId,
                  testIdSequence: allTestRunIds,
                });
                refreshDepData();
              }}
              size="small"
              type="link"
            >
              执行
            </Button>
            <Popconfirm
              okText="确定"
              placement="left"
              cancelText="取消"
              title="当前操作会移除该测试执行，是否继续执行？"
              getPopupContainer={() => getRootContainer()}
              onConfirm={() => removeTestRelation([item.objectId])}
            >
              <Button size="small" type="link">
                移除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [allTestRunIds, refreshDepData, removeTestRelation]);

  // 添加测试用例菜单
  const testDetailMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        async onClick() {
          const selectedTestDetailIds = await selectorModalRef.current.open({
            testType: TestType.TestDetail,
          });

          const _selectedTestDetailIds = selectedTestDetailIds.filter(
            d => !(relTestDetailIds ?? []).includes(d),
          );

          await createTestRunAndRelation(testEntity, _selectedTestDetailIds);

          refreshDepData();
        },
      },
    ];
  }, [refreshDepData, testEntity, relTestDetailIds]);

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
        rowKey="objectId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
      />

      <TestRunModal className={cx('run-modal')} actionRef={testRunModalActionRef} />
    </div>
  );
};

export default React.memo(Test);
