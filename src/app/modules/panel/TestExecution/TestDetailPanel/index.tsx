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
  getTestEntityByQuery,
} from '@/lib/api/item';
import cx from './index.less';
import createProximaSdk, { useListener } from '@projectproxima/proxima-sdk-js';
import { useRequest } from 'ahooks';
import { useTestRunActionAuth } from '@/lib/hooks/useTest';
import useI18n from '@/lib/hooks/useI18n';

const Test = () => {
  const proxima = createProximaSdk();
  const { t } = useI18n();
  const { testEntity, workspace } = useTestConfig();
  const { getCreatePermission } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const { canExecuteTestRun } = useTestRunActionAuth({ workspaceKey: workspace?.key });

  const selectorModalRef = React.useRef<SelectorActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();

  useListener('updateItemList', async props => {
    if (props?.type === 'create') return;
    if (props?.type === 'delete') {
      await deleteRunLinkExecution();
    }
  });

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
    async page => {
      const { list: runs, total } = await getLinkedTestEntityByQuery({
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: testEntity?.objectId,
        destinationType: TestType.Run,
        workspaceKey: workspace?.key,
        ...page,
      });

      const { list: cases } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspace?.key,
          type: TestType.Case,
          id: runs?.map(d => d.referenceCase),
        },
        limit: 10,
      });

      const caseMap = new Map();

      cases?.forEach(d => {
        caseMap.set(d.id, d.key);
      });

      return {
        total,
        list: runs.map(r => ({
          ...r,
          key: caseMap.get(r.referenceCase),
        })),
      };
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

  const deleteRunLinkExecution = useCallback(async () => {
    if (!testEntity?.objectId) return;
    const { list: runIds } = await getLinkedTestEntityByQuery({
      query: {
        workspaceKey: workspace?.key,
      },
      limit: 9999,
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: [testEntity?.objectId],
      destinationType: TestType.Run,
      onlySelectId: true,
    });
    if (runIds?.length) {
      const res = await deleteTestEntity(runIds);
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }
    }
    proxima.execute('deleteExecutionRefresh');
  }, [testEntity?.objectId, workspace?.key]);

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
        message.error(t('page.plan.testEntityList.deleteItemTips'));
        return;
      }
      // 删除测试和测试执行的关联
      const res = await deleteTestEntity(testRunIds);
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }

      refreshDepData();

      message.success(t('common.deleteSuccess'));
    },
    [getCreatePermission, refreshDepData, t],
  );

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      {
        title: t('modules.panel.testExecution.testDetailPanel.itemKey'),
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
        title: t('modules.panel.testExecution.testDetailPanel.itemName'),
        key: 'name',
        render(_, record) {
          const name = record?.name;

          return <Typography.Text ellipsis={{ tooltip: name }}>{name}</Typography.Text>;
        },
      },
      {
        title: t('modules.panel.testExecution.testDetailPanel.runStatus'),
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
        title: t('common.action'),
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
                  {t('common.run')}
                </Button>
              </Tooltip>
              <Popconfirm
                okText={t('common.confirm')}
                placement="left"
                cancelText={t('common.cancel')}
                title={t('modules.panel.testDetail.testRunPanel.popConfirmTips')}
                getPopupContainer={() => getRootContainer()}
                onConfirm={() => removeTestRelation([record.objectId])}
              >
                <Button size="small" type="link">
                  {t('common.remove')}
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
        title: t('modules.panel.testExecution.testDetailPanel.existingTestCase'),
        async onClick() {
          const selectedTestDetailIds = await selectorModalRef.current.open({
            testType: TestType.Case,
          });

          const _selectedTestDetailIds = selectedTestDetailIds.filter(
            d => !(relCase ?? []).includes(d),
          );
          if (getCreatePermission(TestType.Case)) {
            message.error(t('page.plan.testEntityList.addItemTips'));
            return;
          }

          try {
            // 添加关联
            const { data } = await batchCreateTestRun({
              executionId: testEntity.objectId,
              caseIds: _selectedTestDetailIds,
            });
            if (data?.status === 'error') {
              message.error(data.data);
              return;
            }

            refreshDepData();
          } catch (error) {
            console.info(error);
          }
        },
      },
    ];
  }, [getCreatePermission, refreshDepData, relCase, testEntity.objectId, t]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title={t('modules.panel.testExecution.testDetailPanel.assCaseToExecution')}
        ignoreTestEntityIds={relCase}
      />

      <StatusProcessBar status={relRunStatuses} />

      <PanelTable
        renderActions={() => (
          <DropDownButton menuList={testDetailMenuList}>
            {t('modules.panel.testExecution.testDetailPanel.addCase')} <DownOutlined />
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

      <TestRunModal
        className={cx('run-modal')}
        actionRef={testRunModalActionRef}
        idSequence={allRunIds ?? []}
      />
    </div>
  );
};

export default React.memo(Test);
