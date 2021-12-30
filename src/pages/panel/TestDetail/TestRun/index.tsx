import React from 'react';
import { uniqueId } from 'lodash';
import { Button, Space, Typography, message } from '@osui/ui';
import AddTestExecutionModal from './components/AddTestExecutionModal';
import { CaretRightOutlined, EllipsisOutlined } from '@ant-design/icons';
// import ExtendTestExecutionModal from './components/ExtendTestExecutionModal';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import { ColumnsType } from 'antd/es/table';
import { GetTestRunsById, CreateTestExecutionWithItemModal } from '@/lib/api/runs';
import TestTableStatus from '@/pages/run/components/TestTableStatus';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import { removeTestRelations } from '@/lib/api/common';
import TestRunModal from '@/pages/run/Modal';
import { getDevConfig } from '@/devEnv';

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

  const tableColumns: ColumnsType<RunItem> = [
    {
      title: '密钥',
      key: 'referenceId',
      render: (value, item) => (
        <Typography.Link
          ellipsis={true}
          target="_blank"
          href={`/osc/workspaces/${(item as any)?.reference?.workspace?.key}/item/${
            (item as any)?.reference.key
          }`}
        >
          {item.referenceKey}
        </Typography.Link>
      ),
    },
    {
      title: '摘要',
      key: 'referenceName',
      dataIndex: 'referenceName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value, item) => <TestTableStatus status={value} testId={item.testRunId} />,
    },
    {
      title: '执行',
      key: 'testRunId',
      render: (value, item) => (
        <TestRunModal
          testId={item.testRunId}
          onCancel={() => setTimeout(() => tableActionRef.current.refresh(), 200)}
          trigger={
            <Button size="small" type="primary" icon={<CaretRightOutlined />}>
              执行
            </Button>
          }
        />
      ),
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

  const createTestExecution = async () => {
    const token = uniqueId('TestPlan');
    const { testEntity: testExecutionEntity, extraData } = await createItemUseModal({
      type: TestType.TestExecution,
      extraData: { token },
    });
    // token 不相同则不创建关联
    if (extraData.token !== token) return;

    CreateTestExecutionWithItemModal(itemId, testExecutionEntity).then(() => {
      tableActionRef.current.refresh();
      message.success('测试计划创建成功');
    });
  };

  return (
    <RunsContext.Provider
      value={{
        refresh: tableRefresh,
      }}
    >
      <div className={css('runs')}>
        <div className={css('runs__new')}>
          <Space>
            {/* <AddTestExecutionModal
              trigger={<Button type="primary">新增测试执行</Button>}
              itemId={itemId}
            /> */}
            <Button type="primary" onClick={() => createTestExecution()}>
              新增测试执行
            </Button>
            {/* <ExtendTestExecutionModal
            trigger={<Button type="primary">继承测试执行</Button>}
            itemId={itemId}
          /> */}
          </Space>
        </div>

        <div className={css('runs__content')}>
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
            getDataSource={() => GetTestRunsById(itemId)}
          />
        </div>
      </div>
    </RunsContext.Provider>
  );
};

export default Runs;
