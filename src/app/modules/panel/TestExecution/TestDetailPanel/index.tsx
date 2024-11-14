import { DownOutlined, FlagOutlined } from '@ant-design/icons';
import createProximaSdk, { useListener } from '@projectproxima/proxima-sdk-js';
import { useRequest } from 'ahooks';
import {
  Button,
  Divider,
  message,
  notification,
  Popconfirm,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import { keyBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import DropDownButton from '@/components/business/DropDownButton';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import { StatusBadge } from '@/components/business/Status';
import StatusProcessBar from '@/components/business/StatusProcessBar';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import {
  batchCreateTestRun,
  deleteTestEntity,
  getLinkedTestEntityByQuery,
  getTestEntityByQuery,
  updateTestStatus,
} from '@/lib/api/item';
import { getAppEnv } from '@/lib/appEnv';
import { TestLinkType, TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useCanExecuteTestRunIdSequence, useTestRunActionAuth } from '@/lib/hooks/useTest';
import { checkRunStatus } from '@/lib/utils/checkRunStatus';
import { getRootContainer, getTestManagerContainer, goToItemDetailPage } from '@/lib/utils/helper';

import cx from './index.less';

const Test = () => {
  const proxima = createProximaSdk();
  const { t } = useI18n();
  const { testEntity, workspace } = useTestConfig();
  const { getCreatePermission, globalTestConfig } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const { canExecuteTestRun } = useTestRunActionAuth({ workspaceKey: workspace?.key });
  const { getCanExecuteTestRunIdSequence } = useCanExecuteTestRunIdSequence({
    workspaceKey: workspace?.key,
  });

  const selectorModalRef = React.useRef<SelectorActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();

  // useListener('updateItemList', async props => {
  //   if (props?.type === 'create') return;
  //   if (props?.type === 'delete') {
  //     await deleteRunLinkExecution();
  //   }
  // });

  const [allTestEntities, setAllTestEntities] = useState([]);

  const testExecutionFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Execution,
    workspaceKey: workspace?.key,
  });

  const { data: allRunIds } = useRequest(
    async () => {
      if (!testEntity?.objectId && !workspace?.key) {
        return [];
      }
      const { list: runData } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspace?.key,
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
        limit: runs?.length ?? 10,
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
      limit: 99999,
      select: ['referenceCase', 'status', 'id'],
    });

    setAllTestEntities(list);
    return { list, total };
  }, [getReTestEntities]);

  // const deleteRunLinkExecution = useCallback(async () => {
  //   if (!testEntity?.objectId && !workspace?.key) return;
  //   const { list: runIds } = await getLinkedTestEntityByQuery({
  //     query: {
  //       workspaceKey: workspace?.key,
  //     },
  //     limit: 9999,
  //     linkType: TestLinkType.RunLinkExecution,
  //     sourceIds: [testEntity?.objectId],
  //     destinationType: TestType.Run,
  //     onlySelectId: true,
  //   });
  //   if (runIds?.length) {
  //     const res = await deleteTestEntity(runIds);
  //     if (res?.status === 'error') {
  //       message.error(res.data);
  //       return;
  //     }
  //   }
  //   proxima.execute('deleteExecutionRefresh');
  // }, [testEntity?.objectId, workspace?.key]);

  const statusesConfig = useMemo(() => {
    return keyBy(globalTestConfig?.statuses ?? [], 'key');
  }, [globalTestConfig]);

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
    [getAllRelTestEntities, proxima],
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
        width: 170,
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
            const checkStep = getAppEnv('CHECK_STEP_FOR_CHANGE_RUN_STATUS');
            if (checkStep) {
              const flag = checkRunStatus(record, status, statusesConfig, t);
              if (!flag) {
                return;
              }
            }
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
                getPopupContainer={getRootContainer}
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
  }, [
    testEntity?.linkItems,
    refreshDepData,
    allTestRunIds,
    allTestEntities,
    removeTestRelation,
    statusesConfig,
  ]);

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

            refreshDepData('updateTestRunStatus');
          } catch (error) {
            console.info(error);
          }
        },
      },
    ];
  }, [getCreatePermission, refreshDepData, relCase, testEntity.objectId, t]);

  const toggleSTestRunStatus = useCallback(
    async (status, selectedRowKeys) => {
      if (getCreatePermission(TestType.Case)) {
        message.error(t('page.plan.testEntityList.editorItemTips'));
        return;
      }
      console.info('--selectedRowKeys', status, selectedRowKeys);

      // 可执行的测试执行 id
      const canExecuteTestRunIds = await getCanExecuteTestRunIdSequence(selectedRowKeys);

      // 没有可执行的测试执行时直接返回
      if (!canExecuteTestRunIds.length) {
        message.error(t('page.plan.testEntityList.noCanUpdateRunStateTips'));
        return;
      }

      // 更新测试执行状态
      const res = await updateTestStatus({
        status: status.key,
        runIds: canExecuteTestRunIds,
        planId: testEntity?.linkItems?.[0],
      });
      if (res) {
        notification.success({
          message: t('page.plan.testEntityList.updateRunStateTips'),
        });
        refreshDepData();
      }
    },
    [getCanExecuteTestRunIdSequence, getCreatePermission, refreshDepData, t, testEntity?.linkItems],
  );

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title={t('modules.panel.testExecution.testDetailPanel.assCaseToExecution')}
        ignoreTestEntityIds={relCase}
        tableFieldsKeys={testExecutionFieldKeys}
        getContainer={getTestManagerContainer}
      />

      <StatusProcessBar status={relRunStatuses} />

      <PanelTable
        renderActions={() => (
          <DropDownButton menuList={testDetailMenuList}>
            {t('modules.panel.testExecution.testDetailPanel.addCase')} <DownOutlined />
          </DropDownButton>
        )}
        actionRef={tableActionRef}
        allSelectableRowKeys={allTestRunIds}
        actionMenuList={[
          {
            key: 'changeStatus',
            content: selectedRowKeys => (
              <StatusBadge
                useRootContainer
                readonly={getCreatePermission(TestType.Case)}
                onStatusChange={status => toggleSTestRunStatus(status, selectedRowKeys)}
                key="toggleRunStatus"
                emptyNode={
                  <span>
                    <FlagOutlined /> {t('page.plan.testEntityList.updateRunStatus')}
                  </span>
                }
              />
            ),
            onClick(selectedRowKeys) {
              removeTestRelation(selectedRowKeys);
            },
          },
          {
            key: 'delete',
            content: t('common.remove'),
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
        selectedTestPlanId={testEntity?.linkItems?.[0]}
      />
    </div>
  );
};

export default React.memo(Test);
