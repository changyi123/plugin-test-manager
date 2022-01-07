import React from 'react';
import { List, Typography, Tooltip, Modal } from '@osui/ui';
import { DeleteOutlined } from '@ant-design/icons';

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

const ItemList: React.FC = () => {
  const handleItemDelete = () => {
    console.log('asdsadsad');
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
              <div className={css('left__icon')}></div>
              <div
                className={css('left__key')}
                // onClick={() =>
                //   open(`/osc/workspaces/${(item as any)?.workspace?.key}/item/${item?.key}`)
                // }
              >
                {item.key}
              </div>

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
