import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Divider, message, Popconfirm, Space, Tooltip, Typography } from 'antd';
import React from 'react';

import CreatePermission from '@/components/business/Contianer/CreatePermission';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import { StatusBadge } from '@/components/business/Status';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { removeTestRelations } from '@/lib/api/common';
import {
  createTestRunAndRelation,
  getTestRunsAndExecutions,
  toggleTestRunStatus,
} from '@/lib/api/runs';
import { TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getRootContainer, goToItemDetailPage } from '@/lib/utils/helper';

import css from './index.less';

export interface RunsTableProps {
  data?: any;
}

export const RunsContext = React.createContext<{ refresh?: () => void }>({});

const Runs: React.FC = () => {
  const { t } = useI18n();
  const { testEntity: testDetailEntity } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();
  const { createItemUseModal } = useBaseAction();
  const [currentPageTestRunIdSequence, setCurrentPageTestRunIdSequence] = React.useState([]);

  const removeTestRelation = React.useCallback(
    async relationTypeIds => {
      if (!Array.isArray(relationTypeIds)) return;
      await removeTestRelations(relationTypeIds);

      tableActionRef.current.refresh();

      message.success(t('common.deleteSuccess'));
    },
    [t],
  );

  const tableRefresh = React.useCallback(() => {
    tableActionRef.current.refresh();
  }, [tableActionRef]);

  const handleStatusChange = async (testRunId, status) => {
    // TODO 更新测试用例状态方法需修改，测试计划下测试用例状态映射值
    await toggleTestRunStatus(testRunId, status);
    tableActionRef.current.refresh();
  };

  const tableColumns = [
    {
      title: (
        <Space>
          <div>{t('common.testExecution')}</div>
          <div>
            <Tooltip placement="right" title={t('modules.panel.testRunPanel.tooltip')}>
              <InfoCircleOutlined />
            </Tooltip>
          </div>
        </Space>
      ),
      key: 'referenceId',
      width: '65%',
      render: (_, record) => {
        const itemData = record?.reference ?? {};
        return (
          <Space split={<Divider type="vertical" />} size={0}>
            <Typography.Link
              className={css('link')}
              ellipsis={true}
              onClick={() =>
                goToItemDetailPage({
                  workspaceKey: itemData?.workspace?.key,
                  itemKey: itemData?.key,
                })
              }
            >
              <OverflowTooltip title={itemData?.key}> {itemData?.key}</OverflowTooltip>
            </Typography.Link>
            <OverflowTooltip title={itemData?.name}>{itemData?.name}</OverflowTooltip>
          </Space>
        );
      },
    },
    {
      title: t('modules.panel.testRunPanel.runStatus'),
      dataIndex: 'status',
      render: (_, record) => {
        const testRun = record.relTestRun ?? {};
        return (
          <StatusBadge
            useRootContainer
            status={testRun?.status}
            onStatusChange={status => handleStatusChange(testRun.objectId, status)}
          />
        );
      },
    },
    {
      title: t('common.action'),
      key: 'testRunId',
      render: (value, record) => {
        const testRun = record.relTestRun ?? {};
        return (
          <Space split={<Divider type="vertical" />} size={0} style={{ marginLeft: -4 }}>
            <Button
              size="small"
              type="link"
              onClick={async () => {
                await testRunModalActionRef.current.open({
                  testId: testRun.objectId,
                  testIdSequence: currentPageTestRunIdSequence,
                });
                tableActionRef.current.refresh();
              }}
            >
              {t('common.run')}
            </Button>
            <Popconfirm
              placement="left"
              getPopupContainer={getRootContainer}
              title={t('modules.panel.testDetail.testRunPanel.popConfirmTips')}
              onConfirm={() => removeTestRelation([record.relation.objectId])}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
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

  const createTestExecution = async () => {
    const { testEntity: testExecutionEntity } = await createItemUseModal({
      type: TestType.Execution,
    });
    // 创建测试执行实体并关联
    await createTestRunAndRelation(testExecutionEntity, testDetailEntity);
    tableActionRef.current.refresh();
  };

  const tableDataSourceGetter = React.useCallback(
    async queryParams => {
      const data = await getTestRunsAndExecutions(testDetailEntity, queryParams);
      // 添加测试执行序列
      setCurrentPageTestRunIdSequence(
        data.list.map(item => item.relTestRun?.objectId).filter(Boolean),
      );
      return data;
    },
    [testDetailEntity],
  );

  return (
    <RunsContext.Provider
      value={{
        refresh: tableRefresh,
      }}
    >
      <div className={css('runs')}>
        <div className={css('runs__content')}>
          <PanelTable
            scroll={null}
            renderActions={() => (
              <div className={css('runs__new')}>
                <CreatePermission type={TestType.Execution}>
                  <Button type="primary" onClick={() => createTestExecution()}>
                    {t('modules.panel.testPlan.testExecutionPanel.addTestExecution')}
                  </Button>
                </CreatePermission>
              </div>
            )}
            actionRef={tableActionRef}
            actionMenuList={[
              {
                key: 'delete',
                content: t('common.delete'),
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

        <TestRunModal actionRef={testRunModalActionRef} />
      </div>
    </RunsContext.Provider>
  );
};

export default Runs;
