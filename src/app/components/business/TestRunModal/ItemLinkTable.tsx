import { Table } from 'antd';
import { components } from 'proxima-sdk';
import React from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { goToItemDetailPage } from '@/lib/utils/helper';

import cx from './ItemLinkTable.less';
import { TabsComponentBaseProps } from './type';

const { ItemIcon } = components.Components.Common;

type ItemLinkTableProps = TabsComponentBaseProps;

const ItemLinkTable: React.FC<ItemLinkTableProps> = ({ itemLinks }) => {
  const { t } = useI18n();
  const data = itemLinks.map(item => item.destination);

  const tableColumns = [
    {
      title: 'Key',
      width: 120,
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
      title: t('common.title'),
      dataIndex: 'name',
      render(name, record) {
        return (
          <a
            className={cx('link-title')}
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
      title: t('common.type'),
      width: 120,
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
  return <Table pagination={false} rowKey="objectId" columns={tableColumns} dataSource={data} />;
};

export default ItemLinkTable;
