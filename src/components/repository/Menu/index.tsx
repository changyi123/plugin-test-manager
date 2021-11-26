import React from 'react';
import { Dropdown } from '@osui/ui';
import { DropDownProps } from '@osui/dropdown/es';
import ContextMenu, { openContextMenuProps, openContextMenu } from '../../common/ContextMenu';

export enum MenuKey {
  createFolder = 'createFolder',
  renameFolder = 'renameFolder',
  deleteFolder = 'deleteFolder',
  expandFolder = 'expandFolder',
  createTestCase = 'createTestCase',
  createTestSet = 'createTestSet',
}
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
  { key: 'Divider' },
  {
    title: '展开',
    key: MenuKey.expandFolder,
  },
  { key: 'Divider' },
  {
    title: '创建测试用例',
    key: MenuKey.createTestCase,
  },
  {
    title: '创建测试集合',
    key: MenuKey.createTestSet,
  },
];

type FolderMenuWithDropdownProps = Omit<DropDownProps, 'overlay'> & {
  onMenuClick?: (menuKey: MenuKey) => void;
  disabledKeys?: MenuKey[];
  children?: React.ReactNode;
};

export const FolderMenuWithDropdown: React.FC<FolderMenuWithDropdownProps> = ({
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
          <ContextMenu
            menuList={FolderTreeMenus}
            disabledKeys={disabledKeys}
            onClick={({ key }) => onMenuClick(key as MenuKey)}
          />
        </div>
      }
    ></Dropdown>
  );
};

export const openFolderMenu = (
  el: HTMLElement,
  args: { onClick: (key: MenuKey) => void } & Omit<openContextMenuProps, 'menuList' | 'onClick'>,
) => {
  const { onClick, ...restArgs } = args;
  openContextMenu(el, {
    menuList: FolderTreeMenus,
    onClick: ({ key }) => {
      onClick(key as MenuKey);
    },
    ...restArgs,
  });
};
