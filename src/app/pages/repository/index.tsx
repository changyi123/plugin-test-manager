import { useSDK } from '@giteeteam/plugin-sdk';
import { useRequest } from 'ahooks';
import { message, notification } from 'antd';
import { TestFiledKeyMapping, TestType } from 'common/constant';
import { after, cloneDeep } from 'lodash';
import React, { useCallback, useState } from 'react';

import { updateItemsWithProcess } from '@/components/business/BatchResult/hooks';
import TestEntitySelectorModal, { ActionType } from '@/components/business/TestEntitySelectorModal';
import TestManagerProvider from '@/components/business/TestManagerProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import PageLayout from '@/components/common/PageLayout';
import { getDevConfig } from '@/devEnv';
import { getRepositoryTreeV2 } from '@/lib/api/item';
import { featureFlags } from '@/lib/appEnv';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { logPluginVersion } from '@/lib/utils/helper';
import FolderTree from '@/pages/repository/FolderTree';

import ApprovalPage from '../approval';
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

export enum ApprovalEntry {
  View = 'view',
  Create = 'create',
}

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const [viewMode, setViewMode] = React.useState('list');
  const [selectedNodeKey, setSelectedNodeKey] = React.useState(null);
  const [approvalEntry, setApprovalEntry] = React.useState<ApprovalEntry | null>(null);
  const testEntitySelectorRef = React.useRef<ActionType>();
  const { t } = useI18n();
  const enableMinder = featureFlags('ENABLE_MINDER');

  const { createItemUseModal } = useBaseAction();

  const {
    data: folderTreeData = [
      {
        key: 'root',
        name: '全部用例',
        parentKey: null,
      },
    ],
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

  const getSelectCaseIds = useCallback(async () => {
    console.log('getSelectCaseIds', testEntitySelectorRef.current);
    if (!testEntitySelectorRef.current?.open) return;
    const data = await testEntitySelectorRef.current?.open({
      modelProps: {
        title: t('page.plan.planPageLayout.selectCaseModelTitle'),
        footer: {
          ok: {
            name: t('common.nextStep'),
          },
          cancel: {
            name: t('common.cancel'),
          },
        },
      },
    });

    return data;
  }, [t]);

  const createTestApproval = useCallback(async () => {
    const data = await getSelectCaseIds();
    if (!data) return;
    const { selectedData: caseIds } = data;

    console.log('data', data);
    const { item, extraData } = await createItemUseModal({
      type: TestType.Approval,
    });
    if (!item) return;

    console.log('item', item);

    await updateItemsWithProcess({
      title: '用例规划中',
      items: caseIds,
      update: {
        [TestFiledKeyMapping.testApprovals]: {
          concat: [item.objectId],
        },
      },
      handleSuccess: () => {
        notification.success({
          message: t('page.plan.planPageLayout.right.caseToPlanSuccessMessage'),
        });
      },
      handleFail: error => {
        message.error(error.message);
      },
    });
  }, [getSelectCaseIds, t]);

  // 获取最新的 node 数据
  const selectedNode = React.useMemo(() => {
    return getTreeNodeByKey(folderTreeData, selectedNodeKey);
  }, [folderTreeData, selectedNodeKey]);

  if (approvalEntry === ApprovalEntry.View) {
    return <ApprovalPage setApprovalEntry={setApprovalEntry} />;
  }

  return (
    <PageLayout className={cx('test-repository')}>
      <PageLayout.Header>
        <header className={cx('header')}>
          <h6>{t('common.testRepository')}</h6>
          {enableMinder && <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />}
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
          setApprovalEntry,
          createTestApproval,
        })}
        <TestEntitySelectorModal
          title={'创建测试审批'}
          showDefaultRange
          testType={TestType.Case}
          actionRef={testEntitySelectorRef}
          type="add"
        />
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
