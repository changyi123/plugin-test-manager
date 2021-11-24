import React from 'react';
import ReactDOM from 'react-dom';
import { Menu, Dropdown } from '@osui/ui';
import { DropDownProps } from '@osui/dropdown/es';
import { getRootContainer } from '@/lib/utils/helper';

import cx from './index.less';

export enum MenuKey {
  createFolder = 'createFolder',
  renameFolder = 'renameFolder',
  deleteFolder = 'deleteFolder',
  expandFolder = 'expandFolder',
  createTestCase = 'createTestCase',
  createTestSet = 'createTestSet',
}
const DividerMenuItemKey = 'divider';
const FolderTreeMenus = [
  {
    title: '创建目录',
    key: MenuKey.createFolder,
  },
  {
    title: '重命名目录',
    key: MenuKey.renameFolder,
  },
  {
    title: '删除目录',
    key: MenuKey.deleteFolder,
  },
  { key: DividerMenuItemKey },
  {
    title: '展开',
    key: MenuKey.expandFolder,
  },
  { key: DividerMenuItemKey },
  {
    title: '创建测试用例',
    key: MenuKey.createTestCase,
  },
  {
    title: '创建测试集合',
    key: MenuKey.createTestSet,
  },
];

type InnerMenuProps = {
  onMenuClick?: (menuKey: MenuKey) => void;
  disabledKeys?: MenuKey[];
  children?: React.ReactNode;
};

const InnerMenu: React.FC<InnerMenuProps> = ({ onMenuClick, disabledKeys }) => {
  return (
    <Menu
      selectedKeys={[]}
      className={cx('menu')}
      onClick={({ key }) => onMenuClick(key as MenuKey)}
    >
      {FolderTreeMenus.map((menu, index) =>
        menu.key === DividerMenuItemKey ? (
          <Menu.Divider key={index} />
        ) : (
          <Menu.Item disabled={disabledKeys?.includes(menu.key as MenuKey)} key={menu.key}>
            {menu.title}
          </Menu.Item>
        ),
      )}
    </Menu>
  );
};

type ContextMenuProps = Omit<DropDownProps, 'overlay'> & InnerMenuProps;

const ContextMenu: React.FC<ContextMenuProps> = ({
  disabledKeys,
  onMenuClick,
  ...dropDownProps
}) => {
  return (
    <Dropdown
      {...dropDownProps}
      overlay={
        // 增加 empty dom 节点, 使 menu点击后消失
        <div>
          <InnerMenu disabledKeys={disabledKeys} onMenuClick={onMenuClick} />
        </div>
      }
    ></Dropdown>
  );
};

let _menuRef = null;
let _holder = null;
const root = getRootContainer();

const getHolder = () => {
  if (!_holder) {
    _holder = document.createElement('div');
    root.appendChild(_holder);
  }
  return _holder;
};

export const openContextMenu = (
  el: HTMLElement,
  props: InnerMenuProps & { x: number; y: number },
) => {
  if (_menuRef) {
    ReactDOM.unmountComponentAtNode(_holder);
    _menuRef = null;
  }

  _menuRef = <InnerMenu {...props} />;
  const holder = getHolder();

  Object.assign(holder.style, {
    'z-index': '1993',
    position: 'absolute',
    top: `${props.y}px`,
    left: `${props.x}px`,
  });

  ReactDOM.render(_menuRef, holder);
  const handleClick = e => {
    if (!el.contains(e.target)) {
      ReactDOM.unmountComponentAtNode(_holder);
      document.documentElement.removeEventListener('click', handleClick);
    }
  };
  document.documentElement.addEventListener('click', handleClick);
};
ContextMenu.defaultProps = {
  disabledKeys: [],
};

export default React.memo(ContextMenu);
