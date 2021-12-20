import React from 'react';
import { ColumnsType } from 'antd/es/table';
import { Table, Menu, Button, Typography, Dropdown } from '@osui/ui';
import { CaretRightOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons';

import TestTableStatus from '@/pages/run/components/TestTableStatus';

export interface RunsTableProps {
  id?: string;
}

export interface RunItem {
  key: string;
  name: string;
  status: string;
}

const ActionBtn: React.FC<RunsTableProps> = ({ id }) => {
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

const Plan = () => {
  const [page, setPage] = React.useState(1);
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
      render: value => <TestTableStatus status={value} testId="" />,
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
      render: value => <ActionBtn id={value} />,
    },
  ];
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

export default React.memo(Plan);
