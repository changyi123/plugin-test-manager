import React, { useCallback } from 'react';
import { Button, Dropdown, Menu } from '@osui/ui';
import { useTestConfig } from '@/lib/hooks/useContext';
import importTestInfo, { TreeNode } from './export';

const RepoDropDown = ({
  folderKey,
  treeNodeData,
}: {
  folderKey?: string;
  treeNodeData?: TreeNode[];
}) => {
  const { workspace } = useTestConfig();

  const menuClick = useCallback(
    (key: string) => {
      if (key === 'import') {
        // 跳转到导入页面
        const href = `/osc/workspaces/${workspace.key}/import/${workspace.objectId}?app=test_manager`;
        window.open(href);
      } else {
        importTestInfo({
          type: key,
          folderKey,
          treeData: treeNodeData,
          workspaceKey: workspace.key,
          workspaceName: workspace.name,
        });
      }
    },
    [workspace, folderKey, treeNodeData],
  );

  const menu = (
    <Menu onClick={e => menuClick(e.key)}>
      <Menu.Item key="import">导入用例</Menu.Item>
      <Menu.Item key="exportCurrentGroup">导出当前分组下的所有用例</Menu.Item>
      <Menu.Item key="exportAll">导出所有用例</Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} placement="bottomLeft">
        <Button>更多操作</Button>
      </Dropdown>
    </>
  );
};

export default RepoDropDown;
