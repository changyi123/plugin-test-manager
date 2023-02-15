import React from 'react';
import { cloneDeep } from 'lodash';
import { useRequest } from 'ahooks';
import { getDevConfig } from '@/devEnv';
import MinderView from './View/Minder';
import MinderList from './View/List';
import { getTreeNodeByKey } from './util';
import { useSDK } from '@projectproxima/plugin-sdk';
import { logPluginVersion } from '@/lib/utils/helper';
import FolderTree from '@/pages/repository/FolderTree';
import PageLayout from '@/components/common/PageLayout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TestManagerProvider from '@/components/business/TestManagerProvider';
import { getRepositoryTree } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

/** 用例库视图切换 */
const ViewModeSelector = ({ viewMode, onViewModeChange }) => {
  const tabs = [
    {
      key: 'list',
      text: '列表',
    },
    {
      key: 'minder',
      text: '脑图',
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
          {tab.text}
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

  console.info('common.testManager ---------------->', t('common.testManager'));

  const {
    data: folderTreeData = [],
    loading: folderTreeLoading,
    refreshAsync: refreshFolderTree,
  } = useRequest(
    async () => {
      if (!workspaceKey) return [];
      const { data: folders } = await getRepositoryTree({
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

  return (
    <PageLayout className={cx('test-repository')}>
      <PageLayout.Header>
        <header className={cx('header')}>
          <h6>测试用例库</h6>
          <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
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
