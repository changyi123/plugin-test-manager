import React from 'react';
import FolderTree from '@/components/repository/FolderTree';
import TestCase from '@/components/repository/TestCase';

import { useReactive } from 'ahooks';

import { Breadcrumb } from '@osui/ui';

import cx from './index.less';

const MOCK_DATA = [
  {
    title: '测试用例',
    key: '1',
    itemIds: ['123'],
    children: [
      {
        title: '测试用例2',
        key: '2',
        itemIds: ['456'],
        children: [],
      },
      {
        title: '测试用例3',
        key: '3',
        itemIds: ['456'],
        children: [],
      },
    ],
  },
];

const TestRepository = () => {
  const state = useReactive({
    breadcrumb: [],
    folderTreeData: MOCK_DATA,
  });
  const handleSelect = React.useCallback((pos, itemIds) => {
    const indexes = pos.split('-');
    indexes.shift();
    let ref = state.folderTreeData as any;
    state.breadcrumb = indexes.map(index => {
      const data = ref[index];
      ref = data.children;
      return data.title;
    });
  }, []);

  return (
    <div className={cx('test-repository')}>
      <h3 className={cx('title')}>测试管理</h3>
      <div className={cx('layout')}>
        <FolderTree className={cx('left')} onSelect={handleSelect} structure={MOCK_DATA} />
        <div className={cx('right')}>
          <div className={cx('breadcrumb')}>
            <Breadcrumb />
          </div>
          <TestCase />
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestRepository);
