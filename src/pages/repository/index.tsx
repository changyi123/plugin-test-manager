import React from 'react';
import FolderTree from '@/pages/repository/FolderTree';

import Split from '@uiw/react-split';
import TestDetailTable from './TestDetailTable';
import { useReactive, useRequest } from 'ahooks';
import { getFolderTree } from '@/lib/api/repository';
import { useSDK } from '@projectproxima/plugin-sdk';
import { getItemByIQL } from '@/lib/api/proxima';
import { getDevConfig } from '@/devEnv';
import { traverseTreeNodes } from './hook';
import { useTestConfig } from '@/lib/hooks/useContext';
import TestManagerProvider from '@/components/common/TestManagerProvider';

import { Breadcrumb, Input } from '@osui/ui';
import { MacCommandOutlined } from '@ant-design/icons';

import { ROOT_FOLDER_KEY } from './constant';

import cx from './index.less';

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const initialRef = React.useRef(false);
  const [folderTreeData, setFolderTreeData] = React.useState([]);
  const { config } = useTestConfig();

  const state = useReactive({
    items: [],
    itemIds: [],
    breadcrumb: [],
    searchValue: '',
    isRootFolder: false,
    selectedFolderKey: '',
  });

  const { run: fetchItems } = useRequest(getItemByIQL, {
    manual: true,
    staleTime: 5000,
    cacheKey: state.itemIds.toString(),
    onSuccess({ items }) {
      state.items = items;
    },
  });

  const { loading: folderTreeLoading, refresh: refreshFolderTree } = useRequest(
    () => getFolderTree(workspaceKey),
    {
      ready: !!workspaceKey,
      onSuccess(data) {
        setFolderTreeData(data);
      },
    },
  );

  const handleFolderTreeChange = React.useCallback(() => {
    refreshFolderTree();
  }, [refreshFolderTree]);

  // 获取 item
  const fetchFolderItems = React.useCallback(() => {
    if (state.isRootFolder) {
      let itemIds = [];
      traverseTreeNodes(folderTreeData, node => {
        itemIds = itemIds.concat(node.itemIds);
      });

      fetchItems({
        excludeItemId: itemIds,
        workspace: workspaceKey,
        nameLike: state.searchValue,
        itemType: [config.itemTypeMap?.TestDetail],
      });
    } else {
      fetchItems({ itemId: state.itemIds, nameLike: state.searchValue });
    }
  }, [
    fetchItems,
    workspaceKey,
    state.itemIds,
    folderTreeData,
    state.searchValue,
    state.isRootFolder,
    config.itemTypeMap?.TestDetail,
  ]);

  const handleSelect = React.useCallback(
    (node, breadcrumbs) => {
      const itemIds = node.itemIds;
      state.itemIds = itemIds;
      state.selectedFolderKey = node.key;
      state.breadcrumb = breadcrumbs;
      state.isRootFolder = node.key === ROOT_FOLDER_KEY;
      // 第一次使用 useEffect 请求
      if (!initialRef.current) return;
      fetchFolderItems();
    },
    [fetchFolderItems, state],
  );

  React.useEffect(() => {
    if (workspaceKey && config.itemTypeMap?.TestDetail && !initialRef.current) {
      initialRef.current = true;
      fetchFolderItems();
    }
  }, [config.itemTypeMap?.TestDetail, fetchFolderItems, fetchItems, workspaceKey]);

  const treeNodeData = React.useMemo(() => {
    const rootFolder = {
      key: ROOT_FOLDER_KEY,
      name: '未分组用例',
      title: '未分组用例',
      parentId: null,
      itemIds: [],
      icon: <MacCommandOutlined />,
      // 测试案例库有且只有一个根模块
      children: [],
    };
    return [rootFolder].concat(folderTreeData);
  }, [folderTreeData]);

  return (
    <div className={cx('test-repository')}>
      <Split className={cx('layout')}>
        <FolderTree
          className={cx('left')}
          onSelect={handleSelect}
          loading={folderTreeLoading}
          treeNodeData={treeNodeData}
          onFolderTreeChange={handleFolderTreeChange}
        />
        <div className={cx('right')}>
          <div className={cx('header')}>
            <Breadcrumb className={cx('breadcrumb')}>
              {state.breadcrumb.map((title, index) => (
                <Breadcrumb.Item
                  className={cx(index !== state.breadcrumb.length - 1 && 'light')}
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
          <div className={cx('main')}>
            <TestDetailTable selectedFolderKey={state.selectedFolderKey} dataSource={state.items} />
          </div>
        </div>
      </Split>
    </div>
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
