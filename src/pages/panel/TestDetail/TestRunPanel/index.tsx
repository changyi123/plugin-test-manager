import React from 'react';
import { Button, Space, Typography, message, Tooltip, Divider, Popconfirm } from '@osui/ui';
import { InfoCircleOutlined } from '@ant-design/icons';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import { getRootContainer } from '@/lib/utils/helper';
import {
  toggleTestRunStatus,
  createTestRunAndRelation,
  getTestRunsAndExecutions,
} from '@/lib/api/runs';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import { removeTestRelations } from '@/lib/api/common';
import TestRunModal from '@/components/panel/TestRunModal';
import { StatusBadge } from '@/components/common/Status';
import { useTestConfig } from '@/lib/hooks/useContext';

import css from './index.less';

export interface RunsTableProps {
  data?: any;
}

export const RunsContext = React.createContext<{ refresh?: () => void }>({});

const Runs: React.FC = () => {
  const { testEntity: testDetailEntity } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();
  const { createItemUseModal } = useBaseAction();
  const [currentPageTestRunIdSequence, setCurrentPageTestRunIdSequence] = React.useState([]);

  const removeTestRelation = React.useCallback(async relationTypeIds => {
    if (!Array.isArray(relationTypeIds)) return;
    await removeTestRelations(relationTypeIds);

    tableActionRef.current.refresh();

    message.success('删除成功');
  }, []);

  const tableRefresh = React.useCallback(() => {
    tableActionRef.current.refresh();
  }, [tableActionRef]);

  const handleStatusChange = async (testRunId, status) => {
    await toggleTestRunStatus(testRunId, status);
    tableActionRef.current.refresh();
  };

  const tableColumns = [
    {
      title: (
        <Space>
          <div>测试执行任务</div>
          <div>
            <Tooltip placement="right" title="该测试用例的运行包含以下执行轮次">
              <InfoCircleOutlined />
            </Tooltip>
          </div>
        </Space>
      ),
      key: 'referenceId',
      render: (_, record) => {
        const itemData = record?.reference ?? {};
        return (
          <Space split={<Divider type="vertical" />} size={0}>
            <Typography.Link
              ellipsis={true}
              target="_blank"
              href={`/osc/workspaces/${itemData?.workspace?.key}/item/${itemData?.key}`}
            >
              {itemData?.key}
            </Typography.Link>
            <div>{itemData?.name}</div>
          </Space>
        );
      },
    },
    {
      title: '执行状态',
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
      title: '操作',
      key: 'testRunId',
      render: (value, record) => {
        const testRun = record.relTestRun ?? {};
        return (
          <Space split={<Divider type="vertical" />} size={0} style={{ marginLeft: -4 }}>
            <TestRunModal
              testId={testRun.objectId}
              testIdSequence={currentPageTestRunIdSequence}
              onCancel={() => setTimeout(() => tableActionRef.current.refresh(), 200)}
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
              onConfirm={() => removeTestRelation([record.relation.objectId])}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" type="link">
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const createTestExecution = async () => {
    const { testEntity: testExecutionEntity } = await createItemUseModal({
      type: TestType.TestExecution,
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
            renderActions={() => (
              <div className={css('runs__new')}>
                <Button type="primary" onClick={() => createTestExecution()}>
                  新增测试执行任务
                </Button>
              </div>
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
      </div>
    </RunsContext.Provider>
  );
};

export default Runs;
