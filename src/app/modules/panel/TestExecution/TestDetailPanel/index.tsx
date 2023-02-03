import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Typography, message, Space, Button, Divider, Popconfirm, Tooltip } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { TestType, TestLinkType } from '@/lib/constants';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import DropDownButton from '@/components/business/DropDownButton';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
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
  getLinkedTestEntityByQuery,
} from '@/lib/api/item';
import cx from './index.less';
import createProximaSdk, { useListener } from '@projectproxima/proxima-sdk-js';
import { useRequest } from 'ahooks';
import { useTestRunActionAuth } from '@/lib/hooks/useTest';

const Test = () => {
  const { testEntity, workspace } = useTestConfig();
  const { getCreatePermission } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const { canExecuteTestRun } = useTestRunActionAuth({ workspaceKey: workspace?.key });

  const selectorModalRef = React.useRef<SelectorActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();

  const [allTestEntities, setAllTestEntities] = useState([]);

  const { data: allRunIds } = useRequest(
    async () => {
      if (!testEntity?.objectId) {
        return [];
      }
      const { list: runData } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspace.key,
        },
        limit: 9999,
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: [testEntity.objectId],
        destinationType: TestType.Run,
        onlySelectId: true,
      });

      return runData;
    },
    {
      refreshDeps: [workspace, testEntity],
    },
  );

  const getReTestEntities = useCallback(
    page => {
      return getLinkedTestEntityByQuery({
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
    () => allTestEntities.map(entity => entity.id),
    [allTestEntities],
  );

  useEffect(() => {
    getAllRelTestEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshDepData = React.useCallback(
    async (eventKey?: string) => {
      // 全量数据
      const data = await getAllRelTestEntities();
      tableActionRef.current.refresh();
      // 修改执行状态，移除或者添加用例，需要更新外部列表
      const proxima = createProximaSdk();
      proxima.execute(eventKey ?? 'updateRepoTree');
      return data;
    },
    [getAllRelTestEntities],
  );

  useListener('refreshTestRunPanel', () => {
    refreshDepData();
  });

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
      if (getCreatePermission(TestType.Case)) {
        message.error('暂无事项删除权限，请检查事项操作权限配置或联系管理员');
        return;
      }
      // 删除测试和测试执行的关联
      const res = await deleteTestEntity(testRunIds);
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }

      refreshDepData();

      message.success('删除成功');
    },
    [getCreatePermission, refreshDepData],
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
            refreshDepData('updateTestRunStatus');
          };
          const { result: enable } = canExecuteTestRun(record.designee);
          return (
            <StatusBadge
              useRootContainer
              readonly={!enable}
              status={record?.status}
              onStatusChange={handleStatusChange}
            />
          );
        },
      },
      {
        title: '操作',
        key: 'testRunId',
        render: (_, record) => {
          const { result: enable, message } = canExecuteTestRun(record.designee);
          return (
            <Space split={<Divider type="vertical" />} size={0} style={{ marginLeft: -4 }}>
              <Tooltip title={message} placement="topLeft" zIndex={1024}>
                <Button
                  disabled={!enable}
                  onClick={async () => {
                    const { objectId, status } = record || {};
                    await testRunModalActionRef.current.open({
                      testId: objectId,
                      testIdSequence: allTestRunIds,
                    });
                    const res = await refreshDepData();
                    const currentStatus = res.list?.find(data => data.id === objectId)?.status;
                    if (currentStatus !== status) {
                      // 刷新列表的状态
                      const proxima = createProximaSdk();
                      proxima.execute('updateTestRunStatus');
                    }
                  }}
                  size="small"
                  type="link"
                >
                  执行
                </Button>
              </Tooltip>
              <Popconfirm
                okText="确定"
                placement="left"
                cancelText="取消"
                title="当前操作会移除该测试执行，是否继续执行？"
                getPopupContainer={() => getRootContainer()}
                onConfirm={() => removeTestRelation([record.objectId])}
              >
                <Button size="small" type="link">
                  移除
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testEntity?.linkItems, refreshDepData, allTestRunIds, allTestEntities, removeTestRelation]);

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
          if (getCreatePermission(TestType.Case)) {
            message.error('暂无事项删除权限，请检查事项操作权限配置或联系管理员');
            return;
          }

          // 添加关联
          await batchCreateTestRun({
            executionId: testEntity.objectId,
            caseIds: _selectedTestDetailIds,
          });

          refreshDepData();
        },
      },
    ];
  }, [getCreatePermission, refreshDepData, relCase, testEntity.objectId]);

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

      <TestRunModal
        className={cx('run-modal')}
        actionRef={testRunModalActionRef}
        idSequence={allRunIds ?? []}
      />
    </div>
  );
};

export default React.memo(Test);
