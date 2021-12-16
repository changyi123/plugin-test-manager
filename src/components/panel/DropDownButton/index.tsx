import React from 'react';
import { MenuItemProps } from 'antd/lib/menu';
import { Button, Dropdown, Menu } from '@osui/ui';
import { DownOutlined } from '@ant-design/icons';

import './index.less';

type DropdownButtonProps = {
  menuList: Array<MenuItemProps & { [k: string]: any }>;
};

const DropdownButton: React.FC<DropdownButtonProps> = ({ menuList, children }) => {
  const menu = React.useMemo(() => {
    return (
      <Menu>
        {menuList.map((menu, index) => (
          <Menu.Item {...menu} key={index}>
            {menu.title}
          </Menu.Item>
        ))}
      </Menu>
    );
  }, [menuList]);

  return (
    <Dropdown trigger={['click']} overlay={menu} className="dropdown-button">
      <Button type="primary">
        <span>{children}</span>
        <DownOutlined />
      </Button>
    </Dropdown>
  );
};

export default DropdownButton;
