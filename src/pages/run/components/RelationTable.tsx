import React from 'react';
import { Table } from '@osui/ui';
import { ColumnsType } from 'antd/es/table';
import { useRequest } from 'ahooks';
import { getItemLinkRelation } from '@/lib/api/runs';
import Loading from '@/components/common/Loading';
import ItemIcon from './ItemIcon';

import css from './RelationTable.less';

interface IRelationTable {
  itemId: string;

  actionRef: React.ForwardedRef<{
    refresh: () => void;
  }>;
}

interface IItem {
  objectId: string;
  key: string;
  name: string;
  destination: IDestination;
}

interface IDestination {
  objectId: string;
  name: string;
  itemType?: IItemType;
  key: string;
}

interface IItemType {
  icon: string;
  name: string;
  objectId: string;
  key: string;
}

const RelationTable: React.FC<IRelationTable> = props => {
  const { itemId, actionRef } = props;
  //通过事项id，获取关联数据
  const { loading, data, error, refresh } = useRequest(() => getItemLinkRelation(itemId));

  console.log('data', data);

  React.useImperativeHandle(actionRef, () => ({ refresh }));

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }

  const columns: ColumnsType<IItem> = [
    {
      title: '标题',
      dataIndex: 'name',
      render: (_, item) => (
        <a
          onClick={() =>
            open(
              `/osc/workspaces/${(item as any)?.destination?.workspace?.key}/item/${
                item?.destination?.key
              }`,
            )
          }
        >
          {item?.destination?.name}
        </a>
      ),
    },
    {
      title: '所属空间',
      dataIndex: 'workspaceName',
      render: (_, item) => <div>{(item as any)?.destination?.workspace?.name}</div>,
    },
    {
      title: '事项类型',
      dataIndex: 'itemType',
      render: (_, item) => (
        <div className={css('type')}>
          <div className={css('type__icon')}>
            <ItemIcon src={item?.destination?.itemType?.icon} />
          </div>
          <div className={css('type__label')}>{item?.destination?.itemType?.name}</div>
        </div>
      ),
    },
  ];
  return <Table rowKey="objectId" dataSource={data} columns={columns} pagination={false} />;
};

export default RelationTable;
