import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { Button, Dropdown, Menu, message, notification, Spin } from 'antd';
import { MenuItemProps } from 'antd/lib/menu';
import classnames from 'classnames';
import React, { useCallback, useRef } from 'react';

import { ActionType as ModelActionType } from '@/components/business/TestEntitySelectorModal';
import ManageWorkspace from '@/components/business/TestEntitySelectorModal/ManageWorkspace';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { CustomMore } from '@/icons';
import { copyTestCase } from '@/lib/api/item';
import { getAppEnv } from '@/lib/appEnv';
import { TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getProximaBasePath, getTenantKey, inIframe } from '@/lib/utils/helper';
import { SearchSelectors } from '@/lib/utils/iql';

import importTestInfo, { downloadExampleFile, TreeNode } from './export';

const RepoDropDown = ({
  type,
  folderKey,
  className,
  treeNodeData,
  setPageLoading,
  extraMenuOptions,
  selectedTestPlanId,
  repository,
  selector,
}: {
  type: string;
  className?: string;
  folderKey?: string;
  treeNodeData?: TreeNode[];
  selectedTestPlanId?: string;
  filteredCaseIds?: string[];
  extraMenuOptions?: MenuItemProps[];
  setPageLoading?: (val: boolean) => void;
  repository?: Record<string, any>;
  selector?: SearchSelectors | string;
}) => {
  const { t, locale } = useI18n();
  const { workspace } = useTestConfig();
  const { testCaseFieldKeys } = useBaseAction();

  const testEntitySelectorRef = useRef<ModelActionType>();

  const startImportByWorkspace = useCallback(async () => {
    if (!testEntitySelectorRef.current?.open) return;
    const data = await testEntitySelectorRef.current?.open({
      selectValue: [],
      treeType: 'case',
      modelProps: {
        title: t('page.repository.repoDropDown.MenuItem.2'),
        footer: {
          ok: {
            name: t('common.confirm'),
          },
          cancel: {
            name: t('common.cancel'),
          },
        },
      },
    });
    if (data?.selectedData?.length) {
      notification.open({
        message: t('page.repository.repoDropDown.creatingTestCase'),
        icon: <Spin spinning={true} />,
        duration: null,
      });
      setPageLoading?.(true);
      const copyRes = await copyTestCase({
        caseIds: data.selectedData,
        fields: [].concat(SystemFieldKeys, testCaseFieldKeys),
        repository: folderKey,
        workspaceKey: workspace?.key,
      });
      notification.destroy();
      if (copyRes?.status === 'error') {
        notification.error({
          message: `${t('page.repository.repoDropDown.createTestCaseFail')}：${copyRes.data}`,
        });
      } else {
        // 成功
        notification.success({ message: t('page.repository.repoDropDown.createTestCaseSuccess') });
      }
      // 调接口更新列表
      const proxima = createProximaSdk();
      proxima.execute('updateItemList', { type: 'delete' });
      setPageLoading?.(false);
    }
    return data;
  }, [folderKey, setPageLoading, t, testCaseFieldKeys, workspace?.key]);

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
        }?app=test_manager&disableToggleWorkspace=true&hiddenItemType=true&validateRequired=${getAppEnv(
          'GROUP_REQUIRED_WHEN_VALIDATE',
        )}${appendedQueryString}`;
        window.open(href);
      } else if (key === 'example') {
        downloadExampleFile([].concat(SystemFieldKeys, testCaseFieldKeys), t, locale);
      } else if (key === 'importFromWorkspace') {
        // 从别的空间导入
        startImportByWorkspace();
      } else if (
        ['exportAll', 'exportChildGroup', 'exportGroup', 'exportFilter', 'exportPlan'].includes(key)
      ) {
        // 导出逻辑
        notification.open({
          message: t('page.repository.repoDropDown.importCaseLoading'),
          icon: <Spin spinning={true} />,
          duration: null,
        });
        setPageLoading?.(true);
        if (
          !folderKey &&
          type === 'repository' &&
          ['exportGroup', 'exportChildGroup'].includes(key)
        ) {
          message.warning(t('page.repository.repoDropDown.importCaseWarning'));
          setPageLoading?.(false);
        }

        const params = 'exportFilter' === key ? { repository, selector } : {};

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
                  ...params,
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
      workspace,
      testCaseFieldKeys,
      t,
      locale,
      startImportByWorkspace,
      setPageLoading,
      folderKey,
      type,
      repository,
      selector,
      selectedTestPlanId,
      treeNodeData,
    ],
  );

  const refresh = useCallback(() => {}, []);

  const menu = (
    <Menu onClick={e => menuClick(e)}>
      {type === 'repository' && (
        <>
          <Menu.Item key="import">{t('page.repository.repoDropDown.MenuItem.0')}</Menu.Item>
          <Menu.Item key="example">{t('page.repository.repoDropDown.MenuItem.1')}</Menu.Item>
          <Menu.Item key="importFromWorkspace">
            {t('page.repository.repoDropDown.MenuItem.2')}
          </Menu.Item>
          <Menu.Item key="exportAll">{t('page.repository.repoDropDown.MenuItem.3')}</Menu.Item>
          <Menu.Item key="exportGroup">{t('page.repository.repoDropDown.MenuItem.4')}</Menu.Item>
          <Menu.Item key="exportChildGroup">
            {t('page.repository.repoDropDown.MenuItem.5')}
          </Menu.Item>
          <Menu.Item key="exportFilter">{t('page.repository.repoDropDown.MenuItem.7')}</Menu.Item>
        </>
      )}
      {type === 'plan' && (
        <>
          <Menu.Item key="exportPlan" disabled={!selectedTestPlanId}>
            {t('page.repository.repoDropDown.MenuItem.6')}
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
      <Dropdown dropdownRender={() => menu} placement="bottomLeft">
        <Button className={classnames(className)} icon={<CustomMore />} />
      </Dropdown>
      {/* 规划空间测试用例 */}
      <ManageWorkspace
        title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
        testType={TestType.Case}
        actionRef={testEntitySelectorRef}
        onCancel={() => {
          refresh();
        }}
        afterClose={() => {
          refresh();
        }}
      />
    </>
  );
};

export default RepoDropDown;
