import React from 'react';
import classnames from 'classnames';
import { ButtonProps } from 'antd/lib/button';
import { MenuItemProps } from 'antd/lib/menu';
import { DropDownProps } from 'antd/lib/Dropdown';
import { Button, Dropdown, Menu } from '@osui/ui';

import './index.less';

type DropdownButtonProps = {
  className?: string;
  buttonProps?: ButtonProps;
  dropdownProps?: Omit<DropDownProps, 'overlay'>;
  menuList: Array<MenuItemProps & { [k: string]: any }>;
};

const DropdownButton: React.FC<DropdownButtonProps> = ({
  children,
  menuList,
  className,
  buttonProps,
  dropdownProps,
}) => {
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
    <Dropdown
      overlay={menu}
      className={classnames('dropdown-button', className)}
      {...Object.assign({ trigger: ['click'] }, dropdownProps)}
    >
      <Button {...Object.assign({ type: 'primary' }, buttonProps)}>{children}</Button>
    </Dropdown>
  );
};

export default DropdownButton;
