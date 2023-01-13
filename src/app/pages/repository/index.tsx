import React from 'react';
import { getDevConfig } from '@/devEnv';
import { Button, notification, Select } from 'antd';
import { useSDK } from '@projectproxima/plugin-sdk';
import { logPluginVersion } from '@/lib/utils/helper';
import { useBaseAction } from '@/lib/hooks/useContext';
import FolderTree from '@/pages/repository/FolderTree';
import PageLayout from '@/components/common/PageLayout';
import { useListener } from '@projectproxima/proxima-sdk-js';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useReactive, useRequest, useMemoizedFn } from 'ahooks';
import TestDetailTable, { ActionType } from './TestDetailTable';
import { extendFields, RepositoryModel, TestType } from '@/lib/constants';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import TestManagerProvider from '@/components/business/TestManagerProvider';
import { reverseTreeNodes, getTreeNodeByKey, traverseTreeNodes } from './util';

import { UNGROUPED_FOLDER_KEY } from './constant';
import RepoDropDown from './RepoDropDown';
import FilterSearch from '@/components/common/FilterSearch';
import { getRepositoryTree, getTestEntityByQuery } from '@/lib/api/item';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import { getFilterFields } from '@/components/common/FilterSearch/utils';

import cx from './index.less';

type GroupedMode = 'all' | 'current';

/** 分组模式筛选器 */
const GroupModeSelector = (props: { mode: GroupedMode; onChange: (mode: GroupedMode) => void }) => {
  return (
    <Select value={props.mode} onChange={props.onChange}>
      <Select.Option value="all">显示子分组用例</Select.Option>
      <Select.Option value="current">显示当前分组用例</Select.Option>
    </Select>
  );
};

logPluginVersion();

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const tableActionRef = React.useRef<ActionType>();
  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const [groupedMode, setGroupedMode] = React.useState<GroupedMode>('all');

  const testDetailFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Case,
    workspaceKey,
  });
  // 事项数据更新后刷新列表
  useListener('updateItemList', props => {
    if (props?.type === 'create') return;
    setTimeout(() => {
      handleDataChange();
    }, 400);
  });

  useListener('closeItemViewScreen', () => {
    setTimeout(() => {
      handleDataChange();
    }, 400);
  });

  const state = useReactive({
    breadcrumbs: [],
    selectors: [] as any,
    caseIds: [],
    selectedNode: null,
    selectedFolderKey: '',
    tableSelectionVisible: false,
  });

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

      // 更新 selectedNode
      state.selectedNode = getTreeNodeByKey(folders, state.selectedFolderKey);

      return [
        {
          ...folders,
        },
      ];
    },
    {
      ready: Boolean(workspaceKey),
    },
  );

  const { runAsync: getTestDetailIds } = useRequest(
    async (ids: string[]) => {
      if (!ids?.length && !workspaceKey) return [];
      const { list: caseIds } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          id: ids,
        },
        selector: state.selectors,
        offset: 0,
        limit: 99999,
        onlySelectId: true,
      });

      return caseIds;
    },
    {
      manual: true,
    },
  );

  // 更新表单 caseIds
  const refreshTestDetailIds = useMemoizedFn(async (selectedNode?: any) => {
    selectedNode = selectedNode ?? state.selectedNode;
    state.selectedNode = selectedNode;
    let scopedTestDetailIds = [];
    // 包含子分组的所有用例
    if (groupedMode === 'all') {
      traverseTreeNodes([selectedNode], node => {
        scopedTestDetailIds = scopedTestDetailIds.concat(node.caseIds);
      });
    } else {
      scopedTestDetailIds = selectedNode.caseIds;
    }
    state.caseIds = await getTestDetailIds(scopedTestDetailIds);
  });

  const handleTreeSelect = React.useCallback(
    (_selectedNode?: any) => {
      if (_selectedNode) {
        state.selectedNode = _selectedNode;
      }

      const selectedNode = _selectedNode ?? state.selectedNode;

      if (!selectedNode) return;

      const breadcrumbs = [];
      reverseTreeNodes(folderTreeData, selectedNode, node => {
        breadcrumbs.unshift(node.name ?? node.title);
      });
      state.breadcrumbs = breadcrumbs;
      state.selectedFolderKey = selectedNode.key;
      refreshTestDetailIds(selectedNode);
    },
    [folderTreeData, refreshTestDetailIds, state],
  );

  React.useEffect(() => {
    handleTreeSelect();
    tableActionRef.current.resetSelectedRowKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedMode]);

  const handleDataChange = React.useCallback(async () => {
    const treeData = await refreshFolderTree();
    const selectedFolder = getTreeNodeByKey(treeData, state.selectedFolderKey);
    if (selectedFolder) {
      refreshTestDetailIds(selectedFolder);
    }
  }, [refreshFolderTree, refreshTestDetailIds, state]);

  // 处理筛选器搜索
  const handleSelectorSearch = async selectors => {
    state.selectors = selectors;
    // 添加筛选项目需要重置批量选中的 row
    tableActionRef.current.resetSelectedRowKeys();
    await refreshTestDetailIds();
  };

  const toggleSelection = (visible?: boolean) => {
    visible = typeof visible === 'boolean' ? visible : !state.tableSelectionVisible;
    state.tableSelectionVisible = visible;
    tableActionRef.current.resetSelectedRowKeys();
    tableActionRef.current.toggleSelection(visible);
  };

  const createTestDetail = async () => {
    const { testEntityList } = await createItemUseModal({
      type: TestType.Case,
      extraData: {
        useItemBatchCreate: true,
        repository:
          state.selectedFolderKey === UNGROUPED_FOLDER_KEY ? null : state.selectedFolderKey,
      },
    });

    const successMessage =
      testEntityList.length > 1
        ? `${testEntityList.length}个测试用例新建成功`
        : `测试用例【${testEntityList[0]?.name}】新建成功`;
    notification.success({
      message: successMessage,
    });
    await handleDataChange();
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
            <GroupModeSelector mode={groupedMode} onChange={mode => setGroupedMode(mode)} />
            <Button onClick={() => toggleSelection()}>
              {state.tableSelectionVisible ? '取消操作' : '批量操作'}
            </Button>
            <Button
              type="primary"
              disabled={getCreatePermission(TestType.Case)}
              onClick={createTestDetail}
              className={cx('action')}
            >
              新建测试用例
            </Button>
            <RepoDropDown
              type="repository"
              treeNodeData={folderTreeData}
              folderKey={state.selectedFolderKey}
            />
          </div>
        </div>
        <div className={cx('table-container')} style={{ height: 'calc(100% - 105px)' }}>
          <FilterSearch
            className={cx('filter-search-box')}
            onSearch={handleSelectorSearch}
            fields={getFilterFields(testDetailFieldKeys)}
            extendFields={extendFields.filter(field => field.key === RepositoryModel)}
            testType={TestType.Case}
          />
          <TestDetailTable
            actionRef={tableActionRef}
            onDataChange={handleDataChange}
            testDetailIds={state.caseIds}
            folderKey={state.selectedFolderKey}
            onSelectionCancel={() => toggleSelection(false)}
            testDetailFieldKeys={testDetailFieldKeys}
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
