import React, { useEffect } from 'react';
import { Table } from '@osui/ui';
import { ColumnsType } from 'antd/es/table';
import { useRequest } from 'ahooks';
import { FetchItemLinkRelation } from '@/lib/api/runs';
import Loading from '@/components/common/Loading';
import ItemIcon from './ItemIcon';

import css from './RelationTable.less';

interface IRelationTable {
  itemId: string;
  refreshNum?: number;
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

let first = true;
const RelationTable: React.FC<IRelationTable> = props => {
  const { itemId, refreshNum } = props;
  const { loading, data, error, refresh } = useRequest(() => FetchItemLinkRelation(itemId));

  useEffect(() => {
    if (first) {
      first = false;
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshNum]);

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
