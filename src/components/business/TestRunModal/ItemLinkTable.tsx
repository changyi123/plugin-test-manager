import React from 'react';
import { Table } from 'antd';
import { TabsComponentBaseProps } from './type';
// import { ItemIcon } from '@projectproxima/components';
// import { components } from 'proxima-sdk';

// const { ItemIcon } = components.Components.Common.ItemIcon;

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
          {/* <ItemIcon icon={itemType?.icon}></ItemIcon> */}
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
