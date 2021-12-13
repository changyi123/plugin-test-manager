import React from 'react';
import { List, Typography, Button, Modal } from '@osui/ui';
import { DeleteOutlined } from '@ant-design/icons';

import css from './ItemList.less';

const data = [
  {
    title: 'Ant Design Title 1',
  },
  {
    title: 'Ant Design Title 2',
  },
  {
    title: 'Ant Design Title 3',
  },
  {
    title: 'Ant Design Title 4',
  },
];

const ItemList: React.FC = () => {
  const handleItemDelete = () => {
    Modal.confirm({});
  };

  return (
    <List
      className={css('list')}
      size="small"
      bordered
      dataSource={data}
      renderItem={item => (
        <List.Item
          actions={[
            <Button
              className={css('list__item__del')}
              key="delete"
              type="primary"
              danger
              size="small"
              shape="circle"
              onClick={() => handleItemDelete()}
              icon={<DeleteOutlined />}
            />,
          ]}
        >
          <div className={css('list__item')}>
            <div className={css('left')}>
              <div className={css('list__item__link')}>
                <Typography.Link href="#">FVMP-8</Typography.Link>
              </div>

              <div className={css('list__item__name')}>{item.title}</div>
            </div>

            <div className={css('right')}>
              <div className={css('list__item__priority')}>优先级</div>
              <div className={css('list__item__status')}>当前状态</div>
            </div>
          </div>
        </List.Item>
      )}
    />
  );
};

export default ItemList;
