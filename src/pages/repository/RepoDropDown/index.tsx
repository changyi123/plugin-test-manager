import React, { useCallback } from 'react';
import classnames from 'classnames';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getProximaBasePath, getTenantKey } from '@/lib/utils/helper';
import importTestInfo, { TreeNode, downloadExampleFile } from './export';
import { Button, Dropdown, Menu, message, notification, Spin } from 'antd';

const RepoDropDown = ({
  type,
  folderKey,
  buttonText,
  className,
  treeNodeData,
  setPageLoading,
  selectedTestPlanId,
}: {
  type: string;
  className?: string;
  folderKey?: string;
  buttonText?: string;
  treeNodeData?: TreeNode[];
  selectedTestPlanId?: string;
  setPageLoading?: (val: boolean) => void;
}) => {
  const { workspace } = useTestConfig();

  const menuClick = useCallback(
    async (key: string) => {
      if (key === 'import') {
        const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
        // 跳转到导入页面
        const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspace.key}/import/${
          workspace.objectId
        }?app=test_manager&&disableToggleWorkspace`;
        window.open(href);
      } else if (key === 'example') {
        downloadExampleFile();
      } else {
        notification.open({
          message: '测试管理用例导出中',
          icon: <Spin spinning={true} />,
          duration: null,
        });
        setPageLoading?.(true);
        if (type === 'repository' && key === 'exportGroup' && !folderKey) {
          message.warning('未选择用例库，请先选择需要导出的用例库');
        }

        await importTestInfo(
          Object.assign(
            {},
            type === 'plan'
              ? {
                  type: key,
                  checkedId: selectedTestPlanId,
                  workspace,
                }
              : {
                  type: key,
                  checkedId: folderKey,
                  treeData: treeNodeData,
                  workspace,
                },
          ),
        );
        setPageLoading?.(false);
        notification.destroy();
        notification.success({
          message: '测试管理用例导出完成',
        });
      }
    },
    [setPageLoading, workspace, type, folderKey, selectedTestPlanId, treeNodeData],
  );

  const menu = (
    <Menu onClick={e => menuClick(e.key)}>
      {type === 'repository' && (
        <>
          <Menu.Item key="import">导入用例</Menu.Item>
          <Menu.Item key="example">用例导入模板文件下载</Menu.Item>
          <Menu.Item key="exportAll">导出所有用例</Menu.Item>
          <Menu.Item key="exportGroup">导出当前分组下的所有用例</Menu.Item>
        </>
      )}
      {type === 'plan' && (
        <>
          <Menu.Item key="exportPlan" disabled={!selectedTestPlanId}>
            导出当前计划关联测试用例
          </Menu.Item>
        </>
      )}
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} placement="bottomLeft">
        <Button className={classnames(className)}>{buttonText ?? '更多操作'}</Button>
      </Dropdown>
    </>
  );
};

export default RepoDropDown;
