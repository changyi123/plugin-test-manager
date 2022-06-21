import React from 'react';
import { Table } from 'antd';
import { TabsComponentBaseProps } from './type';
import { generateStaticFileUrl } from '@/lib/utils/helper';

const tableColumns = [
  {
    title: '事项ID',
    dataIndex: 'key',
  },
  {
    title: '标题',
    dataIndex: 'name',
  },
  {
    title: '事项类型',
    dataIndex: 'itemType',
    render(itemType) {
      return (
        <>
          <img src={generateStaticFileUrl(itemType?.icon)} width="16" height="16" />
          <span style={{ marginLeft: 8 }}>{itemType?.name}</span>
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
