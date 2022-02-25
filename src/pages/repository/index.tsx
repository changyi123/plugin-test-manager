import React from 'react';
import FolderTree from '@/pages/repository/FolderTree';

import { getDevConfig } from '@/devEnv';
import TestDetailTable from './TestDetailTable';
import { useReactive, useRequest } from 'ahooks';
import { getFolderTree } from '@/lib/api/repository';
import { useSDK } from '@projectproxima/plugin-sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import PageLayout from '@/components/common/PageLayout';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import TestManagerProvider from '@/components/common/TestManagerProvider';
import { traverseTreeNodes, reverseTreeNodes } from './hook';
import { TestType } from '@/lib/constants';

import { Breadcrumb, Input } from '@osui/ui';
import { FileTextOutlined } from '@/icons';

import { ROOT_FOLDER_KEY } from './constant';

import cx from './index.less';

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const initialRef = React.useRef(false);
  const [folderTreeData, setFolderTreeData] = React.useState([]);
  const { config } = useTestConfig();

  const state = useReactive({
    pagination: {
      offset: 0,
      limit: 20,
    },
    total: 20,
    items: [],
    breadcrumb: [],
    searchValue: '',
    testDetailIds: [],
    isRootFolder: false,
    selectedFolderKey: '',
  });

  const { run: fetchItems, loading: tableLoading } = useRequest(getTestEntitiesByQuery, {
    manual: true,
    onSuccess(data) {
      state.items = data.results;
      state.total = data.count;
    },
  });

  const { loading: folderTreeLoading, refreshAsync: refreshFolderTree } = useRequest(
    () => getFolderTree(workspaceKey),
    {
      ready: !!workspaceKey,
      onSuccess(data) {
        setFolderTreeData(data);
      },
    },
  );

  // 获取 item
  const fetchFolderItems = React.useCallback(() => {
    if (state.isRootFolder) {
      let excludeItemId = [];
      traverseTreeNodes(folderTreeData, node => {
        excludeItemId = excludeItemId.concat(node.testDetailIds);
      });

      fetchItems(
        {
          workspaceKey,
          notIn: excludeItemId,
          type: TestType.TestDetail,
          nameLike: state.searchValue,
        },
        {
          ...state.pagination,
          ascendingKeys: state.isRootFolder ? ['createdAt'] : null,
        },
      );
    } else {
      fetchItems({
        workspaceKey,
        in: state.testDetailIds,
        type: TestType.TestDetail,
        nameLike: state.searchValue,
      });
    }
  }, [
    state.isRootFolder,
    state.pagination,
    state.searchValue,
    state.testDetailIds,
    folderTreeData,
    fetchItems,
    workspaceKey,
  ]);

  const handlePageChange = React.useCallback(
    (currentPage, limit) => {
      state.pagination = {
        offset: (currentPage - 1) * limit,
        limit,
      };
      fetchFolderItems();
    },
    [fetchFolderItems, state],
  );

  React.useEffect(() => {
    if (workspaceKey && config.itemTypeMap?.TestDetail && !initialRef.current) {
      initialRef.current = true;
      fetchFolderItems();
    }
  }, [config.itemTypeMap?.TestDetail, fetchFolderItems, workspaceKey]);

  const treeNodeData = React.useMemo(() => {
    const rootFolder = {
      key: ROOT_FOLDER_KEY,
      name: '未分组用例',
      title: '未分组用例',
      parentId: null,
      testDetailIds: [],
      icon: <FileTextOutlined />,
      // 测试案例库有且只有一个根模块
      children: [],
    };
    return [rootFolder].concat(folderTreeData);
  }, [folderTreeData]);

  const handleSelect = React.useCallback(
    node => {
      if (state.selectedFolderKey !== node?.key) {
        // 重置分页参数
        state.pagination = {
          ...state.pagination,
          offset: 0,
        };
      }

      state.selectedFolderKey = node.key;
      const testDetailIds = node.testDetailIds;
      state.testDetailIds = testDetailIds;
      state.isRootFolder = node.key === ROOT_FOLDER_KEY;
      const breadcrumbs = [];
      reverseTreeNodes(treeNodeData, node, n => {
        breadcrumbs.unshift(n.name);
      });
      state.breadcrumb = breadcrumbs;
      // 第一次使用 useEffect 请求
      if (!initialRef.current) return;
      fetchFolderItems();
    },
    [fetchFolderItems, state, treeNodeData],
  );

  return (
    <PageLayout className={cx('test-repository')}>
      <PageLayout.Header>
        <header className={cx('header')}>测试用例仓库</header>
      </PageLayout.Header>
      <PageLayout.Left>
        <FolderTree
          onSelect={handleSelect}
          loading={folderTreeLoading}
          treeNodeData={treeNodeData}
          onFolderTreeChange={refreshFolderTree}
        />
      </PageLayout.Left>
      <PageLayout.Right>
        <div className={cx('breadcrumb-container')}>
          <Breadcrumb
            className={cx('breadcrumb')}
            separator={<span className={cx('separator')}>&gt;</span>}
          >
            {state.breadcrumb.map((title, index) => (
              <Breadcrumb.Item
                className={cx(index !== state.breadcrumb.length - 1 && 'secondary')}
                key={title}
              >
                {title}
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
          <Input.Search
            className={cx('search')}
            placeholder="请输入关键字"
            style={{ width: 200 }}
            value={state.searchValue}
            onSearch={fetchFolderItems}
            onChange={e => (state.searchValue = e.target.value)}
          />
        </div>
        <div className={cx('table-container')}>
          <TestDetailTable
            total={state.total}
            loading={tableLoading}
            dataSource={state.items}
            onPageChange={handlePageChange}
            selectedFolderKey={state.selectedFolderKey}
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
    <TestManagerProvider workspaceKey={workspaceKey}>
      <TestRepository workspaceKey={workspaceKey} />
    </TestManagerProvider>
  );
};

export default React.memo(TestRepositoryPage);
