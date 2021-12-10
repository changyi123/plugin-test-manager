import React from 'react';
import { Dropdown, Menu, Button } from '@osui/ui';
import { DownOutlined } from '@ant-design/icons';
import Table from './components/Table';

import css from './index.less';

const Runs: React.FC = () => {
  return (
    <div className={css('runs')}>
      <div className={css('runs__new')}>
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item key="1">新增测试执行</Menu.Item>
              <Menu.Item key="2">继承测试执行</Menu.Item>
            </Menu>
          }
        >
          <Button type="primary">
            添加执行 <DownOutlined />
          </Button>
        </Dropdown>
      </div>

      <div className={css('runs__content')}>
        <Table />
      </div>
    </div>
  );
};

export default Runs;
