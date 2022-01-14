import React, { useCallback, useEffect } from 'react';
import { List, Typography, Tooltip, Popconfirm, message } from '@osui/ui';
import { DeleteOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { deleteDefect, fetchDefectList } from '@/lib/api/runs';
import Loading from '@/components/common/Loading';
import ItemIcon from './ItemIcon';
import { useItemLinkTypeConfig } from './hooks';

import css from './ItemList.less';

const data = [
  {
    title: 'Ant Design Title 1',
    key: 'PROXIMA-11',
  },
  {
    title: 'Ant Design Title 2',
    key: 'PROXIMA-11',
  },
];

interface ItemListProps {
  defects: Array<{
    label: string;
    value: string;
  }>;
  testId: string;
  save?: () => (value: string[], refresh?: boolean) => void;
}

function mergeData(items: any, defects: ItemListProps['defects']) {
  items?.forEach(item => {
    defects?.forEach(item2 => {
      if (item.id === item2.value) {
        item.label = item2.label;
      }
    });
  });
}

const ItemList: React.FC<ItemListProps> = props => {
  const { defects, testId, save } = props;
  const { TestToDefect = '' } = useItemLinkTypeConfig();

  const { data, loading, error, refresh } = useRequest(() =>
    fetchDefectList(defects.map(item => item.value)),
  );

  useEffect(() => {
    refresh && refresh();
  }, [defects, refresh]);

  const open = useCallback((url: string) => window.open(url), []);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <div>加载失败,原因{error?.message}</div>;
  }

  const { items } = data;

  if (!items?.length) {
    return <div></div>;
  }

  mergeData(items, defects);

  const handleDeleteRelation = (itemId: string) => {
    deleteDefect(TestToDefect, testId, [itemId]).then(() => {
      message.success('删除成功');
      const index = items.findIndex(item => item.objectId === itemId);
      const itemIdsBak = [...items];
      itemIdsBak.splice(index, 1);
      const saveList = itemIdsBak.map(item => item.objectId);
      save && save()(saveList, true);
    });
  };

  return (
    <List
      className={css('list')}
      size="small"
      bordered
      dataSource={items}
      renderItem={(item: any) => (
        <List.Item>
          <div className={css('list__item')}>
            <div className={css('left')}>
              <div className={css('left__tips')}>
                <div className={css('left__tips__content')}>{item.label}</div>
              </div>
              <div className={css('left__icon')}>
                <ItemIcon src={item?.itemType?.icon} />
              </div>
              <div
                className={css('left__key')}
                onClick={() =>
                  open(`/osc/workspaces/${(item as any)?.workspace?.key}/item/${item?.key}`)
                }
              >
                {item.key}
              </div>

              <div className={css('left__name')}>
                <Typography.Text ellipsis={{ tooltip: item.name }}>{item.name}</Typography.Text>
              </div>
            </div>

            <div className={css('right')}>
              {item.label === '全局' && (
                <div className={css('right__icon')}>
                  <Popconfirm
                    placement="left"
                    getPopupContainer={() => document.getElementById('modal-content')}
                    title="当前操作会删除与该缺陷的关联关系，是否继续执行？"
                    onConfirm={() => handleDeleteRelation(item.objectId)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <DeleteOutlined />
                  </Popconfirm>
                </div>
              )}
            </div>
          </div>
        </List.Item>
      )}
    />
  );
};

export const FileList: React.FC = () => {
  const handleItemDelete = () => {
    // console.log('asdsadsad');
  };

  return (
    <List
      className={css('list')}
      size="small"
      bordered
      dataSource={data}
      renderItem={item => (
        <List.Item>
          <div className={css('list__item')}>
            <div className={css('left')}>
              <div className={css('left__tips')}>步骤2</div>

              <div className={css('left__name')}>
                <Typography.Text ellipsis={{ tooltip: item.title }}>{item.title}</Typography.Text>
              </div>
            </div>

            <div className={css('right')}>
              <div className={css('right__icon')} onClick={() => handleItemDelete()}>
                <Tooltip title="删除关联">
                  <DeleteOutlined />
                </Tooltip>
              </div>
            </div>
          </div>
        </List.Item>
      )}
    />
  );
};

export default ItemList;
