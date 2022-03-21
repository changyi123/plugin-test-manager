import React, { useCallback } from 'react';
import { Button, Dropdown, Menu } from '@osui/ui';
import { useTestConfig } from '@/lib/hooks/useContext';

const RepoDropDown = () => {
  const { workspace } = useTestConfig();

  const menuClick = useCallback(
    (key: string) => {
      if (key === 'import') {
        // 跳转到导入页面
        const href = `/osc/workspaces/${workspace.key}/import/${workspace.objectId}?app=test_manager`;
        window.open(href);
      }
    },
    [workspace],
  );

  const menu = (
    <Menu onClick={e => menuClick(e.key)}>
      <Menu.Item key="import">导入用例</Menu.Item>
      <Menu.Item key="export">导出用例</Menu.Item>
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
