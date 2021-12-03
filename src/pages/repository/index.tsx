import React from 'react';
import FolderTree from '@/components/repository/FolderTree';
import TestCase from '@/components/repository/TestCase';
import ConfigProvider from '@/components/common/ConfigProvider';

import { getFolderTree } from '@/lib/api/repository';
import { getItemByIds } from '@/lib/api/common';
import Split from '@uiw/react-split';

import { hasArrayItem } from '@/lib/utils/helper';

import { useReactive, useRequest } from 'ahooks';

import { Breadcrumb, Empty } from '@osui/ui';

import cx from './index.less';

const MOCK_WORKSPACE_ID = 'GBYsF1CYcI';

const TestRepository = () => {
  const [folderTreeData, setFolderTreeData] = React.useState([]);
  const state = useReactive({
    items: [],
    itemIds: [],
    breadcrumb: [],
    selectedFolderKey: '',
  });

  const { run: fetchItems, loading: itemLoading } = useRequest(getItemByIds, {
    manual: true,
    staleTime: 5000,
    cacheKey: state.itemIds.toString(),
    onSuccess(data) {
      state.items = data;
    },
  });

  const { loading: folderTreeLoading, refresh: refreshFolderTree } = useRequest(
    () => getFolderTree(MOCK_WORKSPACE_ID),
    {
      ready: !!MOCK_WORKSPACE_ID,
      onSuccess(data) {
        setFolderTreeData(data);
      },
    },
  );

  const handleFolderTreeChange = React.useCallback(() => {
    refreshFolderTree();
  }, [refreshFolderTree]);

  const handleSelect = React.useCallback(
    (node, breadcrumbs) => {
      const itemIds = node.itemIds;
      state.itemIds = itemIds;
      state.selectedFolderKey = node.key;
      if (Array.isArray(itemIds)) {
        fetchItems(itemIds);
      }
      state.breadcrumb = breadcrumbs;
    },
    [fetchItems, state],
  );

  return (
    <div className={cx('test-repository')}>
      <h2 className={cx('title')}>测试管理</h2>
      {/* FIXME: 插件获取 workspaceId！！！ */}
      <ConfigProvider workspaceId="GBYsF1CYcI">
        <Split className={cx('layout')}>
          <FolderTree
            className={cx('left')}
            onSelect={handleSelect}
            loading={folderTreeLoading}
            treeNodeData={folderTreeData}
            onFolderTreeChange={handleFolderTreeChange}
          />
          <div className={cx('right')}>
            <div className={cx('header')}>
              <Breadcrumb>
                {state.breadcrumb.map((title, index) => (
                  <Breadcrumb.Item
                    className={cx(index + 1 === state.breadcrumb.length && 'highlight')}
                    key={title}
                  >
                    {title}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </div>
            <div className={cx('main')}>
              {!itemLoading && !hasArrayItem(state.items) ? (
                <Empty className={cx('empty')} description="文件夹为空" />
              ) : (
                state.items.map(item => (
                  <TestCase
                    key={item.objectId}
                    selectedFolderKey={state.selectedFolderKey}
                    {...item}
                  />
                ))
              )}
            </div>
          </div>
        </Split>
      </ConfigProvider>
    </div>
  );
};

export default React.memo(TestRepository);
