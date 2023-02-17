import classnames from 'classnames';
import React, { useCallback } from 'react';
import { CustomMore } from '@/icons';
import { useTestConfig } from '@/lib/hooks/useContext';
import { MenuItemProps } from 'antd/lib/menu/MenuItem';
import importTestInfo, { TreeNode, downloadExampleFile } from './export';
import { Button, Dropdown, Menu, message, notification, Spin } from 'antd';
import { getProximaBasePath, getTenantKey, inIframe } from '@/lib/utils/helper';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

const RepoDropDown = ({
  type,
  folderKey,
  className,
  treeNodeData,
  setPageLoading,
  extraMenuOptions,
  selectedTestPlanId,
}: {
  type: string;
  className?: string;
  folderKey?: string;
  treeNodeData?: TreeNode[];
  selectedTestPlanId?: string;
  extraMenuOptions?: MenuItemProps[];
  setPageLoading?: (val: boolean) => void;
}) => {
  const { t } = useI18n();
  const { workspace } = useTestConfig();
  // 条件判断是否需要获取 screenKey
  const testDetailFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Case,
    workspaceKey: workspace?.key,
  });

  const menuClick = useCallback(
    async e => {
      const key = e.key;
      // iframe 中跳转链接增加隐藏 header 和 sider 属性
      const appendedQueryString = inIframe() ? '&hiddenSider=true&hiddenHeader=true' : '';

      if (key === 'import') {
        const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
        // 跳转到导入页面
        const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspace.key}/import/${
          workspace.objectId
        }?app=test_manager&disableToggleWorkspace${appendedQueryString}`;
        window.open(href);
      } else if (key === 'example') {
        downloadExampleFile(testDetailFieldKeys, t);
      } else if (['exportAll', 'exportGroup', 'exportPlan'].includes(key)) {
        // 导出逻辑
        notification.open({
          message: t('page.repository.repoDropDown.importCaseLoading'),
          icon: <Spin spinning={true} />,
          duration: null,
        });
        setPageLoading?.(true);
        if (type === 'repository' && key === 'exportGroup' && !folderKey) {
          message.warning(t('page.repository.repoDropDown.importCaseWarning'));
          setPageLoading?.(false);
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
          t,
        );
        setPageLoading?.(false);
        notification.destroy();
        notification.success({
          message: t('page.repository.repoDropDown.importCaseSuccess'),
        });
      }
    },
    [
      t,
      workspace,
      testDetailFieldKeys,
      setPageLoading,
      type,
      folderKey,
      selectedTestPlanId,
      treeNodeData,
    ],
  );

  const menu = (
    <Menu onClick={e => menuClick(e)}>
      {type === 'repository' && (
        <>
          <Menu.Item key="import">{t('page.repository.repoDropDown.MenuItem.0')}</Menu.Item>
          <Menu.Item key="example">{t('page.repository.repoDropDown.MenuItem.1')}</Menu.Item>
          <Menu.Item key="exportAll">{t('page.repository.repoDropDown.MenuItem.2')}</Menu.Item>
          <Menu.Item key="exportGroup">{t('page.repository.repoDropDown.MenuItem.3')}</Menu.Item>
        </>
      )}
      {type === 'plan' && (
        <>
          <Menu.Item key="exportPlan" disabled={!selectedTestPlanId}>
            {t('page.repository.repoDropDown.MenuItem.4')}
          </Menu.Item>
        </>
      )}
      {Array.isArray(extraMenuOptions)
        ? extraMenuOptions.map((prop, index) => <Menu.Item key={index} {...prop} />)
        : null}
    </Menu>
  );

  return (
    <>
      <Dropdown overlay={menu} placement="bottomLeft">
        <Button className={classnames(className)} icon={<CustomMore />} />
      </Dropdown>
    </>
  );
};

export default RepoDropDown;
