import React from 'react';

import ContextMenu, {
  openContextMenu,
  openContextMenuProps,
} from '@/components/common/ContextMenu';
import useI18n from '@/lib/hooks/useI18n';

export enum MenuKey {
  createFolder = 'createFolder',
  moveFolder = 'moveFolder',
  copyFolder = 'copyFolder',
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
const FolderTreeMenus = t => [
  {
    title: t('page.repository.menu.menusName.0'),
    key: MenuKey.createFolder,
  },
  {
    title: t('page.repository.menu.menusName.1'),
    key: MenuKey.moveFolder,
  },
  {
    title: t('page.repository.menu.menusName.2'),
    key: MenuKey.copyFolder,
  },
  {
    title: t('page.repository.menu.menusName.3'),
    key: MenuKey.renameFolder,
  },
  {
    title: t('page.repository.menu.menusName.4'),
    key: MenuKey.deleteFolder,
  },
  { key: 'Divider' },
  {
    title: t('page.repository.menu.menusName.5'),
    key: MenuKey.expandFolder,
  },
  { key: 'Divider' },
  {
    title: t('page.repository.menu.menusName.6'),
    key: MenuKey.createTest,
  },
  {
    title: t('page.repository.menu.menusName.7'),
    key: MenuKey.importTest,
  },
];

const TestCaseMenus = t => [
  {
    title: t('page.repository.menu.menusName.6'),
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
  const { t } = useI18n();
  return <ContextMenu menuList={FolderTreeMenus(t)} {...props} />;
};

export const openFolderMenu = (
  el: HTMLElement,
  args: { t; onClick: (key: MenuKey) => void } & Omit<openContextMenuProps, 'menuList' | 'onClick'>,
) => {
  const { onClick, t, ...restArgs } = args;
  openContextMenu(el, {
    menuList: FolderTreeMenus(t),
    onClick: ({ key }) => {
      onClick(key as MenuKey);
    },
    ...restArgs,
  });
};

export const TestMenu = props => {
  const { t } = useI18n();
  return <ContextMenu menuList={TestCaseMenus(t)} {...props} />;
};

export const openTestMenu = (
  el: HTMLElement,
  args: { t; onClick: (key: MenuKey) => void } & Omit<openContextMenuProps, 'menuList' | 'onClick'>,
) => {
  const { onClick, t, ...restArgs } = args;
  openContextMenu(el, {
    menuList: TestCaseMenus(t),
    onClick: ({ key }) => {
      onClick(key as MenuKey);
    },
    ...restArgs,
  });
};
