import React, { useState } from 'react';
import { Table, Spin, Typography, Menu, Button, Dropdown, Empty } from '@osui/ui';
import { ColumnsType } from 'antd/es/table';
import { CaretRightOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { GetTestRunsById } from '@/lib/api/runs';
import TestTableStatus from '@/pages/run/components/TestTableStatus';
import TestRunModal from '@/pages/run/Modal';

export interface RunsTableProps {
  itemId?: string;
}

export interface RunItem {
  key: string;
  name: string;
  status: string;
  referenceId: string;
  testRunId: string;
  referenceName: string;
}

const ActionBtn: React.FC<RunsTableProps> = () => {
  const menu = (
    <Menu>
      <Menu.Item key="0">
        <DeleteOutlined /> 删除
      </Menu.Item>
    </Menu>
  );
  return (
    <Dropdown overlay={menu} trigger={['click']}>
      <a className="ant-dropdown-link" onClick={e => e.preventDefault()}>
        更多 <DownOutlined />
      </a>
    </Dropdown>
  );
};

const RunsTable: React.FC<RunsTableProps> = ({ itemId }) => {
  const [page, setPage] = useState(1);
  const columns: ColumnsType<RunItem> = [
    {
      title: '序号',
      render: (value, item, index) => (page - 1) * 10 + index + 1,
    },
    {
      title: '密钥',
      key: 'referenceId',
      render: (value, item) => <Typography.Link href="#">{item.referenceId}</Typography.Link>,
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
      render: value => <ActionBtn itemId={value} />,
    },
  ];
  const { data, error, loading } = useRequest(() => GetTestRunsById(itemId));
  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }
  if (loading) {
    return <Spin tip="加载中..."></Spin>;
  }
  if (!data?.data?.length) {
    return <Empty description="测试运行为空，请创建测试执行"></Empty>;
  }
  // console.log('data', data.data);
  return (
    <Table<RunItem>
      dataSource={data.data}
      columns={columns}
      pagination={{
        onChange(current) {
          setPage(current);
        },
      }}
    />
  );
};

export default RunsTable;
