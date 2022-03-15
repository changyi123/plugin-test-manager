import React from 'react';
import FolderTree from '@/pages/repository/FolderTree';

import { Tooltip, Button, notification } from '@osui/ui';
import { getDevConfig } from '@/devEnv';
import { TestType } from '@/lib/constants';
import { FileTextOutlined, AppstoreAddOutlined } from '@/icons';
import TestDetailTable, { ActionType } from './TestDetailTable';
import { useReactive, useRequest } from 'ahooks';
import { getFolderTree } from '@/lib/api/repository';
import { useSDK } from '@projectproxima/plugin-sdk';
import PageLayout from '@/components/common/PageLayout';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { traverseTreeNodes, reverseTreeNodes, getTreeNodeByKey } from './hook';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import SearchInput from '@/components/business/SearchInput';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import TestManagerProvider from '@/components/business/TestManagerProvider';
import { useBaseAction } from '@/lib/hooks/useContext';
import { updateFolders } from '@/lib/api/repository';

import { ROOT_FOLDER_KEY } from './constant';

import cx from './index.less';

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const tableActionRef = React.useRef<ActionType>();
  const { createItemUseModal } = useBaseAction();

  const state = useReactive({
    breadcrumbs: [],
    searchValue: '',
    testDetailIds: [],
    tableSelectionVisible: false,
    selectedFolderKey: '',
  });

  const {
    data: folderTreeData = [],
    loading: folderTreeLoading,
    refreshAsync: refreshFolderTree,
  } = useRequest(
    async () => {
      // 获取当前空间内所有的测试实体
      const getAllTestDetailEntityIds = async workspaceKey => {
        const { results: data } = await getTestEntitiesByQuery(
          {
            type: TestType.TestDetail,
            workspaceKey,
          },
          {
            limit: 99999,
            include: [],
            select: ['objectId'],
          },
        );

        return data.map(item => item.objectId);
      };
      const [treeNodes, allTestDetailIds] = await Promise.all([
        getFolderTree(workspaceKey),
        getAllTestDetailEntityIds(workspaceKey),
      ]);

      const allTestDetailIdSet = new Set<string>(allTestDetailIds);
      traverseTreeNodes(treeNodes, node => {
        // 测试实体在测试模块内只能被关联一次
        node.testDetailIds = node.testDetailIds.filter(id => {
          if (allTestDetailIdSet.has(id)) {
            allTestDetailIdSet.delete(id);
            return true;
          }
          return false;
        });
      });

      const RootFolder = {
        key: ROOT_FOLDER_KEY,
        name: '未分组用例',
        title: '未分组用例',
        parentId: null,
        testDetailIds: Array.from(allTestDetailIdSet),
        icon: <FileTextOutlined />,
        children: [],
      };

      return [RootFolder].concat(treeNodes);
    },
    {
      ready: !!workspaceKey,
    },
  );

  const handleTreeSelect = React.useCallback(
    selectedNode => {
      const breadcrumbs = [];
      reverseTreeNodes(folderTreeData, selectedNode, node => {
        breadcrumbs.unshift(node.name ?? node.title);
      });
      state.breadcrumbs = breadcrumbs;
      state.testDetailIds = selectedNode.testDetailIds;
      state.selectedFolderKey = selectedNode.key;
    },
    [folderTreeData, state],
  );

  const handleDataChange = React.useCallback(async () => {
    const treeData = await refreshFolderTree();
    const selectedFolder = getTreeNodeByKey(treeData, state.selectedFolderKey);
    if (selectedFolder) {
      state.testDetailIds = selectedFolder.testDetailIds;
    }
  }, [refreshFolderTree, state]);

  const toggleSelection = (visible?: boolean) => {
    visible = typeof visible === 'boolean' ? visible : !state.tableSelectionVisible;
    state.tableSelectionVisible = visible;
    tableActionRef.current.toggleSelection(visible);
  };

  const createTestDetail = async () => {
    const { testEntity: testDetailEntity } = await createItemUseModal({
      type: TestType.TestDetail,
    });

    const testDetailData = testDetailEntity.toJSON();
    await updateFolders([
      {
        key: state.selectedFolderKey,
        testDetailIds: state.testDetailIds.concat(testDetailData.objectId),
      },
    ]);
    notification.success({
      message: `测试用例【${testDetailData.reference.name}】新建成功`,
    });
    tableActionRef.current.refresh();
    handleDataChange();
  };

  return (
    <PageLayout className={cx('test-repository')}>
      <PageLayout.Header>
        <header className={cx('header')}>测试用例库</header>
      </PageLayout.Header>
      <PageLayout.Left>
        <FolderTree
          onSelect={handleTreeSelect}
          loading={folderTreeLoading}
          treeNodeData={folderTreeData}
          onFolderTreeChange={refreshFolderTree}
        />
      </PageLayout.Left>
      <PageLayout.Right>
        <div className={cx('breadcrumb-container')}>
          <OverflowTooltip title={state.breadcrumbs.join('>')} className={cx('breadcrumb')}>
            <div>
              {state.breadcrumbs.map((title, index) => (
                <span
                  className={cx(index !== state.breadcrumbs.length - 1 && 'secondary')}
                  key={index}
                >
                  {title}
                  {index !== state.breadcrumbs.length - 1 && (
                    <span className={cx('separator')}>&gt;</span>
                  )}
                </span>
              ))}
            </div>
          </OverflowTooltip>
          <div className={cx('actions')}>
            <SearchInput onSearch={value => (state.searchValue = value as any)} />
            <Tooltip title="多选操作">
              <AppstoreAddOutlined
                onClick={() => toggleSelection()}
                className={cx('action', 'selection', state.tableSelectionVisible && 'active')}
              />
            </Tooltip>
            <span className={cx('line')} />
            <Button type="primary" onClick={createTestDetail} className={cx('action')}>
              新建测试用例
            </Button>
          </div>
        </div>
        <div className={cx('table-container')}>
          <TestDetailTable
            actionRef={tableActionRef}
            onDataChange={handleDataChange}
            searchValue={state.searchValue}
            testDetailIds={state.testDetailIds}
            folderKey={state.selectedFolderKey}
            onSelectionCancel={() => toggleSelection(false)}
          />
        </div>
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
