import React from 'react';
import { Table } from '@osui/ui';
import { ColumnsType } from 'antd/es/table';
import { CaretRightOutlined } from '@ant-design/icons';

export interface RunItem {
  key: string;
  name: string;
  status: string;
}

const RunsTable: React.FC = () => {
  const dataSource: Array<RunItem> = [
    {
      key: 'IREP-47',
      name: '测试用例111',
      status: '这里是摘要1',
    },
    {
      key: 'IREP-49',
      name: '测试2222',
      status: '这里111',
    },
  ];

  const columns: ColumnsType<RunItem> = [
    {
      title: '密钥',
      dataIndex: 'key',
      key: 'key',
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
    },
    {
      title: '执行',
      render: () => <CaretRightOutlined />,
    },
  ];
  return <Table<RunItem> dataSource={dataSource} columns={columns} />;
};

export default RunsTable;
