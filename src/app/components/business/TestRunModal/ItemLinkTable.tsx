import React from 'react';
import { Table } from 'antd';
import { components } from 'proxima-sdk';
import { TabsComponentBaseProps } from './type';
import { goToItemDetailPage } from '@/lib/utils/helper';

const { ItemIcon } = components.Components.Common;

const tableColumns = [
  {
    title: 'Key',
    dataIndex: 'key',
    render(key, record) {
      return (
        <a
          style={{ color: '#333' }}
          onClick={() =>
            goToItemDetailPage({
              workspaceKey: record.workspace?.key,
              itemKey: record.key,
            })
          }
        >
          {key}
        </a>
      );
    },
  },
  {
    title: '标题',
    dataIndex: 'name',
    render(name, record) {
      return (
        <a
          style={{ color: '#333' }}
          onClick={() =>
            goToItemDetailPage({
              workspaceKey: record.workspace?.key,
              itemKey: record.key,
            })
          }
        >
          {name}
        </a>
      );
    },
  },
  {
    title: '类型',
    dataIndex: 'itemType',
    render(itemType) {
      return (
        <>
          <ItemIcon icon={itemType?.icon}></ItemIcon>
          <span style={{ color: '#333' }}>{itemType?.name}</span>
        </>
      );
    },
  },
];

type ItemLinkTableProps = TabsComponentBaseProps;

const ItemLinkTable: React.FC<ItemLinkTableProps> = ({ itemLinks }) => {
  const data = itemLinks.map(item => item.destination);
  return <Table pagination={false} rowKey="objectId" columns={tableColumns} dataSource={data} />;
};

export default ItemLinkTable;
