import React from 'react';
import FolderTree from '@/components/repository/FolderTree';
import TestCase from '@/components/repository/TestCase';
import DataProvider from '@/components/repository/DataProvider';

import repositoryApi from '@/lib/api/repository';
import Split from '@uiw/react-split';

import { hasArrayItem } from '@/lib/utils/helper';

import { useReactive, useRequest } from 'ahooks';

import { Breadcrumb, Empty } from '@osui/ui';

import cx from './index.less';

const TestRepository = () => {
  const state = useReactive({
    itemIds: [],
    breadcrumb: [],
    folderTreeData: [],
    items: [],
  });

  const { run: fetchItems, loading } = useRequest(repositoryApi.getItemByIds, {
    manual: true,
    cacheKey: `itemIds${state.itemIds.toString()}`,
    onSuccess(data) {
      state.items = data;
    },
  });

  const handleSelect = React.useCallback(
    (indexes, itemIds) => {
      let ref = state.folderTreeData as any;
      state.itemIds = itemIds;
      fetchItems(itemIds);
      state.breadcrumb = indexes.map(index => {
        const data = ref[index];
        ref = data.children;
        return data.title;
      });
    },
    [fetchItems, state],
  );

  return (
    <div className={cx('test-repository')}>
      <h2 className={cx('title')}>测试管理</h2>
      <DataProvider workspaceId="GBYsF1CYcI">
        <Split className={cx('layout')}>
          <FolderTree
            className={cx('left')}
            onSelect={handleSelect}
            structure={state.folderTreeData}
          />
          <div className={cx('right')}>
            <div className={cx('header')}>
              <Breadcrumb>
                {state.breadcrumb.map((title, index) => (
                  <Breadcrumb.Item
                    className={cx(index === state.breadcrumb.length - 1 && 'highlight')}
                    key={title}
                  >
                    {title}
                  </Breadcrumb.Item>
                ))}
              </Breadcrumb>
            </div>
            <div className={cx('main')}>
              {!loading && !hasArrayItem(state.items) ? (
                <Empty className={cx('empty')} description="文件夹为空" />
              ) : (
                <TestCase />
              )}
            </div>
          </div>
        </Split>
      </DataProvider>
    </div>
  );
};

export default React.memo(TestRepository);
