import React, { useState } from 'react';
import { Table, Spin, Typography, Menu, Button, Dropdown, Empty } from '@osui/ui';
import { ColumnsType } from 'antd/es/table';
import { CaretRightOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { GetTestRunsById } from '@/lib/api/runs';
import TestTableStatus from '@/pages/run/components/TestTableStatus';

export interface RunsTableProps {
  itemId?: string;
}

export interface RunItem {
  key: string;
  name: string;
  status: string;
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
  const dataSource: Array<RunItem> = [
    {
      key: 'IREP-47',
      name: '测试用例111',
      status: 'todo',
    },
    {
      key: 'IREP-49',
      name: '测试2222',
      status: 'ing',
    },
  ];
  const columns: ColumnsType<RunItem> = [
    {
      title: '序号',
      render: (value, item, index) => (page - 1) * 10 + index + 1,
    },
    {
      title: '密钥',
      key: 'key',
      dataIndex: 'key',
      render: value => <Typography.Link href="#">{value}</Typography.Link>,
    },
    {
      title: '摘要',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: value => <TestTableStatus status={value} />,
    },
    {
      title: '执行',
      render: () => (
        <Button size="small" type="primary" href="#/testRun" icon={<CaretRightOutlined />}>
          执行
        </Button>
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
      dataSource={dataSource}
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
