import React from 'react';
import { Table } from 'antd';
import { TabsComponentBaseProps } from './type';
import { components } from 'proxima-sdk';

const { ItemIcon } = components.Components.Common;

const tableColumns = [
  {
    title: 'Key',
    dataIndex: 'key',
  },
  {
    title: '标题',
    dataIndex: 'name',
  },
  {
    title: '类型',
    dataIndex: 'itemType',
    render(itemType) {
      return (
        <>
          <ItemIcon icon={itemType?.icon}></ItemIcon>
          <span>{itemType?.name}</span>
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
