import React from 'react';
import { pick } from 'lodash';
import { FileClose } from '@/icons';
import { getDevConfig } from '@/devEnv';
import { TestType } from '@/lib/constants';
import { Button, notification } from 'antd';
import { useReactive, useRequest } from 'ahooks';
import { useSDK } from '@projectproxima/plugin-sdk';
import { getFolderTree } from '@/lib/api/repository';
import { logPluginVersion } from '@/lib/utils/helper';
import { useBaseAction } from '@/lib/hooks/useContext';
import FolderTree from '@/pages/repository/FolderTree';
import PageLayout from '@/components/common/PageLayout';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { useListener } from '@projectproxima/proxima-sdk-js';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TestDetailTable, { ActionType } from './TestDetailTable';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import TestManagerProvider from '@/components/business/TestManagerProvider';
import { reverseTreeNodes, getTreeNodeByKey, appendGroupedDetailIdsToTreeNode } from './util';

import { UNGROUPED_FOLDER_KEY } from './constant';
import RepoDropDown from './RepoDropDown';
import FilterSearch from '@/components/common/FilterSearch';
import { SearchSelectors } from '@/lib/utils/iql';
import cx from './index.less';

logPluginVersion();

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const tableActionRef = React.useRef<ActionType>();
  const { createItemUseModal } = useBaseAction();

  // 事项数据更新后刷新列表
  useListener('updateItemList', () => {
    setTimeout(() => {
      tableActionRef.current.refresh();
    }, 400);
  });

  const state = useReactive({
    breadcrumbs: [],
    selectors: [],
    testDetailIds: [],
    selectedFolderKey: '',
    tableSelectionVisible: false,
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
            select: ['objectId', 'repository'],
          },
        );

        return data.map(item => pick(item, ['objectId', 'repository']));
      };

      const [treeNodes, allTestDetailIds] = await Promise.all([
        getFolderTree(workspaceKey),
        getAllTestDetailEntityIds(workspaceKey),
      ]);

      const ungroupedDetailIds = appendGroupedDetailIdsToTreeNode(treeNodes, allTestDetailIds);

      const RootFolder = {
        key: UNGROUPED_FOLDER_KEY,
        name: '未分组用例',
        title: '未分组用例',
        parentId: null,
        testDetailIds: ungroupedDetailIds,
        icon: <FileClose />,
        children: [],
      };

      return [RootFolder].concat(treeNodes);
    },
    {
      ready: Boolean(workspaceKey),
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
    tableActionRef.current.resetSelectedRowKeys();
    tableActionRef.current.toggleSelection(visible);
  };

  const createTestDetail = async () => {
    const { testEntity: testDetailEntity } = await createItemUseModal({
      type: TestType.TestDetail,
      extraData: {
        fields: {
          repository:
            state.selectedFolderKey === UNGROUPED_FOLDER_KEY ? null : state.selectedFolderKey,
        },
      },
    });

    const testDetailData = testDetailEntity.toJSON();
    // TODO: 创建时加入到测试执行中

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
            <Button onClick={() => toggleSelection()}>
              {state.tableSelectionVisible ? '取消操作' : '批量操作'}
            </Button>

            <span className={cx('line')} />
            <Button type="primary" onClick={createTestDetail} className={cx('action')}>
              新建测试用例
            </Button>
            <RepoDropDown
              type="repository"
              folderKey={state.selectedFolderKey}
              treeNodeData={folderTreeData}
            />
          </div>
        </div>
        <div className={cx('table-container')} style={{ height: 'calc(100% - 55px)' }}>
          <FilterSearch
            fields={['createdBy', 'priority', 'assignee', 'createdAt']}
            extendFields={[]}
            onSearch={data => (state.selectors = data)}
          />
          <TestDetailTable
            actionRef={tableActionRef}
            onDataChange={handleDataChange}
            selectors={state.selectors as SearchSelectors}
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
