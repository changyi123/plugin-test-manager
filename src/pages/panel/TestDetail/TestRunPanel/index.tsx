import React from 'react';
import { uniqueId } from 'lodash';
import { Button, Space, Typography, message, Tooltip, Divider, Popconfirm } from '@osui/ui';
// import AddTestExecutionModal from './components/AddTestExecutionModal';
import { InfoCircleOutlined } from '@ant-design/icons';
// import ExtendTestExecutionModal from './components/ExtendTestExecutionModal';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import { ColumnsType } from 'antd/es/table';
import { getRootContainer } from '@/lib/utils/helper';
import {
  GetTestRunsById,
  CreateTestExecutionWithItemModal,
  toggleTestRunStatus,
} from '@/lib/api/runs';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import { removeTestRelations } from '@/lib/api/common';
import TestRunModal from '@/pages/run/Modal';
import { getDevConfig } from '@/devEnv';
import { StatusBadge } from '@/components/common/Status';

import css from './index.less';

export interface RunsTableProps {
  data?: any;
}

export interface RunItem {
  key: string;
  name: string;
  status: string;
  referenceKey: string;
  testRunId: string;
  referenceName: string;
  testRelationId: string;
}

export const RunsContext = React.createContext<{ refresh?: () => void }>({});

const Runs: React.FC = () => {
  const itemId: string = window?.QiankunProps?.context?.itemId || getDevConfig().itemId;
  const tableActionRef = React.useRef<ActionType>();
  const { createItemUseModal } = useBaseAction();

  const removeTestRelation = React.useCallback(async relationTypeIds => {
    if (!Array.isArray(relationTypeIds)) return;
    await removeTestRelations(relationTypeIds);

    tableActionRef.current.refresh();

    message.success('删除成功');
  }, []);

  const tableRefresh = React.useCallback(() => {
    tableActionRef.current.refresh();
  }, [tableActionRef]);

  const handleStatusChange = async (record, status) => {
    await toggleTestRunStatus(record.testRunId, status);
    tableActionRef.current.refresh();
  };

  const tableColumns: ColumnsType<RunItem> = [
    {
      title: (
        <Space>
          <div>测试执行轮次</div>
          <div>
            <Tooltip placement="right" title="该测试用例的运行包含以下执行轮次">
              <InfoCircleOutlined />
            </Tooltip>
          </div>
        </Space>
      ),
      key: 'referenceId',
      render: (value, item) => (
        <Space split={<Divider type="vertical" />} size={0}>
          <Typography.Link
            ellipsis={true}
            target="_blank"
            href={`/osc/workspaces/${(item as any)?.reference?.workspace?.key}/item/${
              (item as any)?.reference?.key
            }`}
          >
            {item.referenceKey}
          </Typography.Link>
          <div>{item.referenceName}</div>
        </Space>
      ),
    },
    {
      title: '执行状态',
      dataIndex: 'status',
      render: (_, record) => {
        return (
          <StatusBadge
            useRootContainer
            status={record?.status}
            onStatusChange={status => handleStatusChange(record, status)}
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
            testId={item.testRunId}
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

  const createTestExecution = async () => {

    const token = uniqueId('TestExecution');
    const { testEntity: testExecutionEntity, extraData } = await createItemUseModal({
      type: TestType.TestExecution,
      extraData: { token },
    });
    // token 不相同则不创建关联
    if (extraData.token !== token) return;
    CreateTestExecutionWithItemModal(itemId, testExecutionEntity).then(() => {
      tableActionRef.current.refresh();
      /* message.success('测试计划创建成功'); */
      message.success('测试执行轮次创建成功');
    });
  };

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
                <Space>
                  {/* <AddTestExecutionModal
                trigger={<Button type="primary">新增测试执行</Button>}
                itemId={itemId}
              /> */}
                  <Button type="primary" onClick={() => createTestExecution()}>
                    新增测试执行轮次
                  </Button>
                  {/* <ExtendTestExecutionModal
              trigger={<Button type="primary">继承测试执行</Button>}
              itemId={itemId}
            /> */}
                </Space>
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
            getDataSource={queryParams => GetTestRunsById(itemId, queryParams)}
          />
        </div>
      </div>
    </RunsContext.Provider>
  );
};

export default Runs;
