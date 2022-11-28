import React from 'react';
import ContextMenu, {
  openContextMenuProps,
  openContextMenu,
} from '@/components/common/ContextMenu';

export enum MenuKey {
  createFolder = 'createFolder',
  renameFolder = 'renameFolder',
  deleteFolder = 'deleteFolder',
  expandFolder = 'expandFolder',
  createTest = 'createTest',
  deleteTest = 'deleteTest',
  viewTest = 'viewTest',
  importTest = 'importTest',

  addTestCaseToTestSet = 'addTestCaseToTestSet',
  addTestCaseToTestPlan = 'addTestCaseToTestPlan',
  addTestCaseToTestExecution = 'addTestCaseToTestExecution',
  createTestWithTestSet = 'createTestWithTestSet',
  createTestWithTestPlan = 'createTestWithTestPlan',
  createTestWithTestExecution = 'createTestWithTestExecution',
}
const FolderTreeMenus = [
  {
    title: '新建子模块',
    key: MenuKey.createFolder,
  },
  {
    title: '重命名',
    key: MenuKey.renameFolder,
  },
  {
    title: '删除',
    key: MenuKey.deleteFolder,
  },
  { key: 'Divider' },
  {
    title: '展开',
    key: MenuKey.expandFolder,
  },
  { key: 'Divider' },
  {
    title: '新建测试用例',
    key: MenuKey.createTest,
  },
  {
    title: '导入用例',
    key: MenuKey.importTest,
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

export const FolderMenu = props => {
  return <ContextMenu menuList={FolderTreeMenus} {...props} />;
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

export const TestMenu = props => {
  return <ContextMenu menuList={TestCaseMenus} {...props} />;
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
