import React from 'react';
import { Dropdown } from '@osui/ui';
import { DropDownProps } from '@osui/dropdown/es';
import ContextMenu, { openContextMenuProps, openContextMenu } from '../../common/ContextMenu';

export enum MenuKey {
  createFolder = 'createFolder',
  renameFolder = 'renameFolder',
  deleteFolder = 'deleteFolder',
  expandFolder = 'expandFolder',
  createTest = 'createTest',
  deleteTest = 'deleteTest',
  viewTest = 'viewTest',

  addTestCaseToTestSet = 'addTestCaseToTestSet',
  addTestCaseToTestPlan = 'addTestCaseToTestPlan',
  addTestCaseToTestExecution = 'addTestCaseToTestExecution',
  createTestWithTestSet = 'createTestWithTestSet',
  createTestWithTestPlan = 'createTestWithTestPlan',
  createTestWithTestExecution = 'createTestWithTestExecution',
}
const FolderTreeMenus = [
  {
    title: '创建模块',
    key: MenuKey.createFolder,
  },
  {
    title: '重命名模块',
    key: MenuKey.renameFolder,
  },
  {
    title: '删除模块',
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
    key: MenuKey.createTest,
  },
];

const TestCaseMenus = [
  {
    title: '查看测试用例',
    key: MenuKey.viewTest,
  },
  // { key: 'Divider' },
  // {
  //   title: '删除测试用例',
  //   key: MenuKey.deleteTest,
  // },
  // { key: 'Divider' },
  // { title: '创建测试集合包含测试用例', key: MenuKey.createTestWithTestSet },
  // { title: '添加测试用例至测试集合', key: MenuKey.addTestCaseToTestSet },
  // { key: 'Divider' },
  // { title: '创建测试计划包含测试用例', key: MenuKey.createTestWithTestPlan },
  // { title: '添加测试用例至测试计划', key: MenuKey.addTestCaseToTestPlan },
  // { key: 'Divider' },
  // { title: '创建测试执行包含测试用例', key: MenuKey.createTestWithTestExecution },
  // { title: '添加测试用例至测试执行', key: MenuKey.addTestCaseToTestExecution },
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

export const openTestMenu = (
  el: HTMLElement,
  args: { onClick: (key: MenuKey) => void } & Omit<openContextMenuProps, 'menuList' | 'onClick'>,
) => {
  const { onClick, ...restArgs } = args;
  openContextMenu(el, {
    menuList: TestCaseMenus,
    onClick: ({ key }) => {
      onClick(key as MenuKey);
    },
    ...restArgs,
  });
};
