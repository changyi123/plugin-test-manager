import React, { useCallback } from 'react';
import { Button, Dropdown, Menu, message } from '@osui/ui';
import { useTestConfig } from '@/lib/hooks/useContext';
import importTestInfo, { TreeNode } from './export';
import { getProximaBasePath } from '@/lib/utils/helper';

const RepoDropDown = ({
  type,
  folderKey,
  treeNodeData,
}: {
  type: string;
  folderKey?: string;
  treeNodeData?: TreeNode[];
}) => {
  const { workspace } = useTestConfig();

  const menuClick = useCallback(
    (key: string) => {
      if (key === 'import') {
        const baseUrl = getProximaBasePath() ? getProximaBasePath() : '/';
        // 跳转到导入页面
        const href = `${baseUrl}osc/workspaces/${workspace.key}/import/${workspace.objectId}?app=test_manager&&disableToggleWorkspace`;
        window.open(href);
      } else {
        if (type === 'repository' && key === 'exportGroup' && !folderKey) {
          message.warning('未选择用例库，请先选择需要导出的用例库');
        }

        importTestInfo({
          type: key,
          checkGroupKey: folderKey,
          treeData: treeNodeData,
          workspace,
        });
      }
    },
    [workspace, type, folderKey, treeNodeData],
  );

  const menu = (
    <Menu onClick={e => menuClick(e.key)}>
      {type === 'repository' && (
        <>
          <Menu.Item key="import">导入用例</Menu.Item>
          <Menu.Item key="exportGroup">导出当前分组下的所有用例</Menu.Item>
          <Menu.Item key="exportAll">导出所有用例</Menu.Item>
        </>
      )}
      {type === 'plan' && (
        <>
          <Menu.Item key="exportGroup">导出当前执行计划下的所有用例</Menu.Item>
        </>
      )}
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
