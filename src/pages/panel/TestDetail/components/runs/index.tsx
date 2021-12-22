import React from 'react';
import { Button, Space, Typography, message } from '@osui/ui';
import AddTestExecutionModal from './components/AddTestExecutionModal';
import { CaretRightOutlined, EllipsisOutlined } from '@ant-design/icons';
// import ExtendTestExecutionModal from './components/ExtendTestExecutionModal';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import { ColumnsType } from 'antd/es/table';
import { GetTestRunsById } from '@/lib/api/runs';
import TestTableStatus from '@/pages/run/components/TestTableStatus';
import { removeTestRelations } from '@/lib/api/common';
import TestRunModal from '@/pages/run/Modal';

import css from './index.less';

export interface RunsTableProps {
  data?: any;
}

export interface RunItem {
  key: string;
  name: string;
  status: string;
  referenceId: string;
  testRunId: string;
  referenceName: string;
  testRelationId: string;
}

export const RunsContext = React.createContext<{ refresh?: () => void }>({});

const Runs: React.FC = () => {
  const itemId: string = window?.QiankunProps?.context?.itemId || 'rCbadjFXZx';
  const tableActionRef = React.useRef<ActionType>();

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
          {item.referenceId}
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

  // console.log('data?.data', data?.data);

  return (
    <RunsContext.Provider
      value={{
        refresh: tableRefresh,
      }}
    >
      <div className={css('runs')}>
        <div className={css('runs__new')}>
          <Space>
            <AddTestExecutionModal
              trigger={<Button type="primary">新增测试执行</Button>}
              itemId={itemId}
            />
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
