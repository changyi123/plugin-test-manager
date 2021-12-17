import React from 'react';
import { ButtonProps } from 'antd/lib/button';
import { MenuItemProps } from 'antd/lib/menu';
import { Button, Dropdown, Menu } from '@osui/ui';
import { DownOutlined } from '@ant-design/icons';

import './index.less';

type DropdownButtonProps = {
  buttonProps?: ButtonProps;
  menuList: Array<MenuItemProps & { [k: string]: any }>;
};

const DropdownButton: React.FC<DropdownButtonProps> = ({ menuList, buttonProps, children }) => {
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
      <Button {...(buttonProps || { type: 'primary' })}>
        <span>{children}</span>
        <DownOutlined />
      </Button>
    </Dropdown>
  );
};

export default DropdownButton;
