import _ from 'lodash';
import React from 'react';
import { Tree } from 'antd';
import { TestType } from '@/lib/constants';
import { hasArrayItem } from '@/lib/utils/helper';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { FileOpen, FileClose, CaretDownOutlined } from '@/icons';
import { useTestRepositoryFolderTree } from '@/lib/hooks/useTest';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { UNGROUPED_FOLDER_KEY } from '@/pages/repository/constant';
import { useRequest, useMemoizedFn, useDeepCompareEffect } from 'ahooks';
import { traverseTreeNodes, getTreeNodeByKey } from '@/pages/repository/util';

import cx from './style.less';

const { DirectoryTree } = Tree;

type RepositoryTreeProps = {
  /** 空间标识 */
  workspaceKey: string;
  /** 是否包含子目录 */
  shouldIncludeSubFolder?: boolean;
  /** 用例 id 范围 */
  scopedTestDetailIds?: string[];
  /** 目录被选中 */
  onFolderSelect?: (
    testDetailIds: string[],
    extraData: {
      selectedFolder: any;
    },
  ) => void;
};

const RepositoryTree: React.FC<RepositoryTreeProps> = props => {
  const {
    workspaceKey,
    onFolderSelect,
    scopedTestDetailIds,
    shouldIncludeSubFolder = true,
  } = props;
  const [treeSelectedKeys, setTreeSelectedKeys] = React.useState([]);
  const [treeExpandedKeys, setTreeExpandedKeys] = React.useState([]);
  const isFirstFolderActivatedRef = React.useRef(false);

  const { data: folderTreeNodes, loading: folderTreeNodesLoading } =
    useTestRepositoryFolderTree(workspaceKey);

  const { data: allTestDetails, loading: allTestDetailsLoading } = useNoExpiredRequest(
    async () => {
      // 请求所有的用例数据
      const { results } = await getTestEntitiesByQuery(
        {
          type: TestType.TestDetail,
          workspaceKey,
        },
        {
          limit: 99999,
          select: ['repository'],
        },
      );

      return results;
    },
    {
      cacheKey: `folder_tree_data_workspaceKey${workspaceKey}`,
      refreshDeps: [folderTreeNodes, workspaceKey],
    },
  );

  const { data: treeData } = useRequest(
    async () => {
      const processChain = _.chain(allTestDetails);

      // 如果有用例 id 范围，则过滤用例
      if (hasArrayItem(scopedTestDetailIds)) {
        const scopedTestDetailIdSet = new Set(scopedTestDetailIds);
        processChain.filter(test => scopedTestDetailIdSet.has(test.objectId));
      }

      const repositoryTestDetailIdMap = processChain
        .reduce((map, test) => {
          const repositoryId = test.repository?.objectId ?? UNGROUPED_FOLDER_KEY;
          const existedTestDetailIds = map.get(repositoryId) ?? [];
          map.set(repositoryId, [...existedTestDetailIds, test.objectId]);
          return map;
        }, new Map())
        .value();

      const folderTreeNodesWithRoot = [
        {
          parentKey: null,
          name: '全部用例',
          title: '全部用例',
          icon: <FileClose />,
          children: folderTreeNodes,
          key: UNGROUPED_FOLDER_KEY,
          ids: repositoryTestDetailIdMap.get(UNGROUPED_FOLDER_KEY) ?? [],
        },
      ];

      // 转换为树渲染结构
      traverseTreeNodes(folderTreeNodesWithRoot, node => {
        const testDetailIds = repositoryTestDetailIdMap.get(node.key) ?? [];
        let childTestDetailNum = 0;
        // 递归子目录获取数量（包含当前节点）
        traverseTreeNodes([node], child => {
          const num = repositoryTestDetailIdMap.get(child.key)?.length ?? 0;
          childTestDetailNum += num;
        });
        const amount = [testDetailIds.length, childTestDetailNum];
        node.amount = amount;
        node.ids = testDetailIds;
      });

      return folderTreeNodesWithRoot;
    },
    {
      refreshDeps: [folderTreeNodes, allTestDetails, scopedTestDetailIds],
    },
  );

  // 选中第一个节点
  React.useEffect(() => {
    if (hasArrayItem(treeData) && !isFirstFolderActivatedRef.current) {
      isFirstFolderActivatedRef.current = true;
      const keys = [treeData[0].key];
      setTreeSelectedKeys(keys);
      setTreeExpandedKeys(keys);
    }
  }, [treeData]);

  // workspaceKey 改变重置选中节点
  React.useEffect(() => {
    isFirstFolderActivatedRef.current = false;
  }, [workspaceKey]);

  // 触发 onFolderChange 时间
  useDeepCompareEffect(() => {
    const selectedFolder = getTreeNodeByKey(treeData, treeSelectedKeys[0]);
    if (selectedFolder) {
      let ids = [];
      // 包含所有子集节点的用例
      if (shouldIncludeSubFolder) {
        traverseTreeNodes([selectedFolder], node => {
          ids = ids.concat(node.ids);
        });
      } else {
        ids = selectedFolder.ids;
      }

      onFolderSelect(ids, {
        selectedFolder,
      });
    }
  }, [treeSelectedKeys, treeData, shouldIncludeSubFolder]);

  // 树节点渲染
  const titleRender = useMemoizedFn(node => {
    const [currentNum, childNodeNum] = node.amount;

    return (
      <>
        <OverflowTooltip title={node.name}>
          <span className={cx('tree-node-name')}>{node.name}</span>
        </OverflowTooltip>

        <span className={cx('tree-node-length')}>{`${currentNum}(${childNodeNum})`}</span>
      </>
    );
  });

  const handleTreeExpand = useMemoizedFn(expandedKeys => {
    setTreeExpandedKeys(expandedKeys);
  });
  const handleTreeSelect = useMemoizedFn(selectedKeys => {
    setTreeSelectedKeys(selectedKeys);
  });

  const handleTreeRightClick = useMemoizedFn(({ event }) => {
    event.preventDefault();
    // 所有案例无右侧菜单
    // if (node.key === UNGROUPED_FOLDER_KEY) return;
  });

  // 是否正在加载
  const loading = folderTreeNodesLoading && allTestDetailsLoading;

  return (
    <div>
      <DirectoryTree
        treeData={treeData}
        expandAction={false}
        className={cx('tree')}
        titleRender={titleRender}
        onExpand={handleTreeExpand}
        onSelect={handleTreeSelect}
        onRightClick={handleTreeRightClick}
        selectedKeys={treeSelectedKeys}
        expandedKeys={treeExpandedKeys}
        icon={({ expanded }) => (expanded ? <FileOpen /> : <FileClose />)}
        switcherIcon={<CaretDownOutlined style={{ color: '#878C96' }} />}
      />
    </div>
  );
};

export default RepositoryTree;
