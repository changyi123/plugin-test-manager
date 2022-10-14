import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Typography, message, Space, Button, Divider, Popconfirm } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { TestType, TestLinkType } from '@/lib/constants';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import DropDownButton from '@/components/business/DropDownButton';
import { useTestConfig } from '@/lib/hooks/useContext';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { getRootContainer, goToItemDetailPage } from '@/lib/utils/helper';
import { StatusBadge } from '@/components/business/Status';
import StatusProcessBar from '@/components/business/StatusProcessBar';
import {
  batchCreateTestRun,
  deleteTestEntity,
  updateTestStatus,
  getlinkedTestEntityByQuery,
} from '@/lib/api/item';
import cx from './index.less';
import createProximaSdk from '@projectproxima/proxima-sdk-js';

const Test = () => {
  const { testEntity, workspace } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();

  const selectorModalRef = React.useRef<SelectorActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();

  const [allTestEntities, setAllTestEntities] = useState([]);

  const getReTestEntities = useCallback(
    page => {
      return getlinkedTestEntityByQuery({
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: testEntity?.objectId,
        destinationType: TestType.Run,
        workspaceKey: workspace?.key,
        ...page,
      });
    },
    [testEntity?.objectId, workspace?.key],
  );

  // 获取测试任务下的测试执行
  const getAllRelTestEntities = useCallback(async () => {
    const { list, total } = await getReTestEntities({
      offset: 0,
      limit: 9999,
      select: ['referenceCase', 'status', 'id'],
    });
    setAllTestEntities(list);
    return { list, total };
  }, [getReTestEntities]);

  // 关联的测试用例
  const relCase = useMemo(() => allTestEntities.map(item => item.referenceCase), [allTestEntities]);

  // 组装所有状态
  const relRunStatuses = useMemo(() => {
    const status = {};
    allTestEntities.forEach(item => {
      status[item.status] = (status[item.status] || 0) + 1;
    });
    return status;
  }, [allTestEntities]);

  // 所有的测试执行
  const allTestRunIds = React.useMemo(
    () => allTestEntities.map(entity => entity.objectId),
    [allTestEntities],
  );

  useEffect(() => {
    getAllRelTestEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshDepData = React.useCallback(() => {
    // 全量数据
    getAllRelTestEntities();
    tableActionRef.current.refresh();
    // 修改执行状态，移除或者添加用例，需要更新外部列表
    const proxima = createProximaSdk();
    proxima.execute('updateRepoTree');
  }, [getAllRelTestEntities]);

  const tableDataSourceGetter = React.useCallback(
    params => {
      // 分页
      return getReTestEntities(params);
    },
    [getReTestEntities],
  );

  const removeTestRelation = React.useCallback(
    async testRunIds => {
      if (!Array.isArray(testRunIds)) return;
      // 删除测试和测试执行的关联
      await deleteTestEntity(testRunIds);

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
        key: 'key',
        width: 100,
        render(_, item) {
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
          const name = record?.name;

          return <Typography.Text ellipsis={{ tooltip: name }}>{name}</Typography.Text>;
        },
      },
      {
        title: '执行状态',
        dataIndex: 'status',
        key: 'status',
        render: (_, record) => {
          const handleStatusChange = async status => {
            await updateTestStatus({
              runIds: [record.objectId],
              status: status.key,
              planId: testEntity?.linkItems?.[0] ?? '',
            });
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
            testType: TestType.Case,
          });

          const _selectedTestDetailIds = selectedTestDetailIds.filter(
            d => !(relCase ?? []).includes(d),
          );

          // 添加关联
          await batchCreateTestRun({
            executionId: testEntity.objectId,
            caseIds: _selectedTestDetailIds,
          });

          refreshDepData();
        },
      },
    ];
  }, [refreshDepData, relCase, testEntity.objectId]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title="添加测试用例到当前测试执行"
        ignoreTestEntityIds={relCase}
      />

      <StatusProcessBar status={relRunStatuses} />

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
