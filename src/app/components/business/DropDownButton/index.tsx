import './index.less';

import { Button, Dropdown, Menu } from 'antd';
import { ButtonProps } from 'antd/lib/button';
import { DropDownProps } from 'antd/lib/dropdown';
import { MenuItemProps } from 'antd/lib/menu';
import classnames from 'classnames';
import React from 'react';

type DropdownButtonProps = {
  className?: string;
  buttonProps?: ButtonProps;
  dropdownProps?: Omit<DropDownProps, 'overlay'>;
  menuList: Array<MenuItemProps & { [k: string]: any }>;
  children: any;
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
          <Menu.Item {...menu} key={index} title={menu.extraTitle || menu.title}>
            {menu.title}
          </Menu.Item>
        ))}
      </Menu>
    );
  }, [menuList]);

  return (
    <Dropdown
      dropdownRender={() => menu}
      className={classnames('dropdown-button', className)}
      getPopupContainer={() => document.querySelector('body')}
      {...Object.assign({ trigger: ['click'] }, dropdownProps)}
    >
      <Button {...Object.assign({ type: 'primary' }, buttonProps)}>{children}</Button>
    </Dropdown>
  );
};

export default DropdownButton;
