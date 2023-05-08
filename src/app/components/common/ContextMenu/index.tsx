import './index.global.less';

import { Menu } from 'antd';
import { MenuItemProps, MenuProps } from 'antd/lib/menu';
import React from 'react';
import ReactDOM from 'react-dom';

import { getRootContainer } from '@/lib/utils/helper';

export type MenuListItemProps = MenuItemProps & {
  key: 'Divider' | string;
};

export type ContextMenuProps = MenuProps & {
  disabledKeys?: string[];
  menuList: MenuListItemProps[];
};

const ContextMenu: React.FC<ContextMenuProps> = ({
  onClick,
  menuList,
  disabledKeys,
  ...menuProps
}) => {
  return (
    <Menu
      onClick={arg => {
        arg.domEvent.preventDefault();
        arg.domEvent.stopPropagation();
        onClick(arg);
      }}
      {...menuProps}
      className="context-menu"
    >
      {menuList.map((menu, index) =>
        menu.key === 'Divider' ? (
          <Menu.Divider key={index} />
        ) : (
          <Menu.Item {...menu} disabled={disabledKeys?.includes(menu.key)} key={menu.key}>
            {menu.title}
          </Menu.Item>
        ),
      )}
    </Menu>
  );
};

let _menuRef = null;
let _menuHolder = null;
const root = getRootContainer();
const getMenuHolder = () => {
  if (!_menuHolder) {
    _menuHolder = document.createElement('div');
    root.appendChild(_menuHolder);
  }
  return _menuHolder;
};

export type openContextMenuProps = ContextMenuProps & { x: number; y: number };

export const openContextMenu = (el: HTMLElement, props: openContextMenuProps) => {
  if (_menuRef) {
    ReactDOM.unmountComponentAtNode(_menuHolder);
    _menuRef = null;
  }

  const { x, y, ...contextProps } = props;

  _menuRef = <ContextMenu {...contextProps} />;
  const holder = getMenuHolder();

  Object.assign(holder.style, {
    'z-index': '1993',
    position: 'fixed',
    top: `${y}px`,
    left: `${x}px`,
  });

  ReactDOM.render(_menuRef, holder);
  const handleClick = e => {
    if (!el.contains(e.target)) {
      ReactDOM.unmountComponentAtNode(_menuHolder);
      document.documentElement.removeEventListener('click', handleClick);
    }
  };
  document.documentElement.addEventListener('click', handleClick);
};

export default React.memo(ContextMenu);
