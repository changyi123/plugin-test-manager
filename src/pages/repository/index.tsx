import React from 'react';
import FolderTree from '@/components/repository/FolderTree';
import TestCase from '@/components/repository/TestCase';

import Split from '@uiw/react-split';
import { useReactive, useRequest } from 'ahooks';
import { hasArrayItem } from '@/lib/utils/helper';
import { getFolderTree } from '@/lib/api/repository';
import { useSDK } from '@projectproxima/plugin-sdk';
import { getItemByIQL, getCustomFields } from '@/lib/api/proxima';
import { useTestConfig } from '@/lib/hooks/useContext';
import TestManagerProvider from '@/components/common/TestManagerProvider';
import { TestType } from '@/lib/constants';
import { BaseTable, BaseTableProvider } from '@/components/common/Table';

import { Breadcrumb, Empty } from '@osui/ui';

import cx from './index.less';

const MOCK_WORKSPACE_KEY = 'TEST_MANAGE_1';
const ALL_FOLDER_KEY = 'ALL';

const TestRepository: React.FC<{ workspaceKey: string }> = ({ workspaceKey }) => {
  const initialRef = React.useRef(false);
  const [folderTreeData, setFolderTreeData] = React.useState([]);
  const { config } = useTestConfig();

  const state = useReactive({
    items: [],
    itemIds: [],
    breadcrumb: [],
    customFields: [],
    selectedFolderKey: '',
  });

  const { run: fetchItems, loading: itemLoading } = useRequest(getItemByIQL, {
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

  useRequest(getCustomFields, {
    ready: !!workspaceKey,
    cacheKey: 'getCustomFields',
    onSuccess(data) {
      state.customFields = data;
    },
  });

  const handleFolderTreeChange = React.useCallback(() => {
    refreshFolderTree();
  }, [refreshFolderTree]);

  const handleSelect = React.useCallback(
    (node, breadcrumbs) => {
      const itemIds = node.itemIds;
      state.itemIds = itemIds;
      state.selectedFolderKey = node.key;
      if (node.key === ALL_FOLDER_KEY) {
        fetchItems({ workspace: workspaceKey, itemType: [config.itemTypeMap?.TestDetail] });
      } else {
        fetchItems({ itemKey: itemIds });
      }
      state.breadcrumb = breadcrumbs;
    },
    [config.itemTypeMap, fetchItems, state, workspaceKey],
  );

  React.useEffect(() => {
    if (workspaceKey && config.itemTypeMap?.TestDetail && !initialRef.current) {
      initialRef.current = true;
      fetchItems({ workspace: workspaceKey, itemType: [config.itemTypeMap?.TestDetail] });
    }
  }, [config.itemTypeMap?.TestDetail, fetchItems, workspaceKey]);

  const treeNodeData = React.useMemo(() => {
    const rootFolder = {
      key: ALL_FOLDER_KEY,
      name: '所有案例',
      title: '所有案例',
      parentId: null,
      itemIds: [],
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
              // state.items.map(item => (
              //   <TestCase
              //     key={item.objectId}
              //     selectedFolderKey={state.selectedFolderKey}
              //     {...item}
              //   />
              // ))
              <BaseTableProvider customFields={state.customFields} selectedKeys={['name', 'key']}>
                <BaseTable data={state.items} />
              </BaseTableProvider>
            )}
          </div>
        </div>
      </Split>
    </div>
  );
};

const TestRepositoryPage = () => {
  const { context } = useSDK();
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? MOCK_WORKSPACE_KEY;
  return (
    <TestManagerProvider workspaceKey={workspaceKey}>
      <TestRepository workspaceKey={workspaceKey} />
    </TestManagerProvider>
  );
};

export default React.memo(TestRepositoryPage);
