import { useSDK } from '@projectproxima/plugin-sdk';
import { useRequest } from 'ahooks';
import { cloneDeep } from 'lodash';
import React from 'react';

import TestManagerProvider from '@/components/business/TestManagerProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import PageLayout from '@/components/common/PageLayout';
import { getDevConfig } from '@/devEnv';
import { getRepositoryTreeV2 } from '@/lib/api/item';
import { featureFlags } from '@/lib/appEnv';
import useI18n from '@/lib/hooks/useI18n';
import { logPluginVersion } from '@/lib/utils/helper';
import FolderTree from '@/pages/repository/FolderTree';

import cx from './index.less';
import { getTreeNodeByKey } from './util';
import MinderList from './View/List';
import MinderView from './View/Minder';

/** 用例库视图切换 */
const ViewModeSelector = ({ viewMode, onViewModeChange }) => {
  const { t } = useI18n();
  const tabs = [
    {
      key: 'list',
      text: 'list',
    },
    {
      key: 'minder',
      text: 'minder',
    },
  ];

  return (
    <div className={cx('view-selector-container')}>
      {tabs.map(tab => (
        <span
          key={tab.key}
          onClick={() => onViewModeChange(tab.key)}
          className={cx('item', viewMode === tab.key && 'actived')}
        >
          {t(`page.repository.${tab.text}`)}
        </span>
      ))}
    </div>
  );
};

logPluginVersion();

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const [viewMode, setViewMode] = React.useState('list');
  const [selectedNodeKey, setSelectedNodeKey] = React.useState(null);
  const { t } = useI18n();
  const disableMinder = featureFlags('DISABLE_MINDER');

  const {
    data: folderTreeData = [],
    loading: folderTreeLoading,
    refreshAsync: refreshFolderTree,
  } = useRequest(
    async () => {
      if (!workspaceKey) return [];
      const { data: folders } = await getRepositoryTreeV2({
        workspaceKey,
      });

      return [cloneDeep(folders)];
    },
    {
      ready: Boolean(workspaceKey),
    },
  );

  // 获取最新的 node 数据
  const selectedNode = React.useMemo(() => {
    return getTreeNodeByKey(folderTreeData, selectedNodeKey);
  }, [folderTreeData, selectedNodeKey]);

  React.useEffect(() => {
    if (viewMode !== 'minder')
      // 折叠右侧面板
      (window as any).globalState?.setItem?.('collapsedStatus', true);
  }, [viewMode]);

  return (
    <PageLayout className={cx('test-repository')}>
      <PageLayout.Header>
        <header className={cx('header')}>
          <h6>{t('common.testRepository')}</h6>
          {!disableMinder && (
            <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
          )}
        </header>
      </PageLayout.Header>
      <PageLayout.Left>
        <FolderTree
          loading={folderTreeLoading}
          treeNodeData={folderTreeData}
          onFolderTreeChange={refreshFolderTree}
          onSelect={node => setSelectedNodeKey(node.key)}
        />
      </PageLayout.Left>
      <PageLayout.Right>
        {React.createElement(viewMode === 'minder' ? MinderView : MinderList, {
          selectedNode,
          folderTreeData,
          toggleViewModel: setViewMode,
          onFolderTreeChange: refreshFolderTree,
        })}
      </PageLayout.Right>
    </PageLayout>
  );
};

const TestRepositoryPage = () => {
  const { context } = useSDK();

  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;

  return (
    <ErrorBoundary>
      <TestManagerProvider workspaceKey={workspaceKey}>
        <TestRepository workspaceKey={workspaceKey} />
      </TestManagerProvider>
    </ErrorBoundary>
  );
};

export default React.memo(TestRepositoryPage);
