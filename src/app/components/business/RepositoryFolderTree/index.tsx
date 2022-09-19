/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react';
import { Tree } from 'antd';
import _, { CollectionChain } from 'lodash';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { FileOpen, FileClose, CaretDownOutlined } from '@/icons';
import { useTestRepositoryFolderTree } from '@/lib/hooks/useTest';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { UNGROUPED_FOLDER_KEY } from '@/pages/repository/constant';
import { hasArrayItem, escapeMatchesQueryArg } from '@/lib/utils/helper';
import { useRequest, useMemoizedFn, useDeepCompareEffect } from 'ahooks';
import { traverseTreeNodes, getTreeNodeByKey, reverseTreeNodes } from '@/pages/repository/util';
import { getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';

import cx from './style.less';

const { DirectoryTree } = Tree;

export type ActionType = {
  /** 筛选目录 */
  filterFolder: (text: string) => void;
  /** 重置筛选 */
  restFilter: () => void;
  /** 重新查询 treeData */
  refresh: () => void;
};

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
  actionRef?: React.ForwardedRef<ActionType>;
};

const RepositoryTree: React.FC<RepositoryTreeProps> = props => {
  const {
    actionRef,
    workspaceKey,
    onFolderSelect,
    scopedTestDetailIds,
    shouldIncludeSubFolder = true,
  } = props;
  const [treeSelectedKeys, setTreeSelectedKeys] = React.useState([]);
  const [treeExpandedKeys, setTreeExpandedKeys] = React.useState([]);
  const isFirstFolderActivatedRef = React.useRef(false);
  const [autoExpandParent, setAutoExpandParent] = React.useState(true);
  // 匹配的目录名
  const [matchedFolderText, setMatchedFolderText] = React.useState({});

  const { data: folderTreeNodes } = useTestRepositoryFolderTree(workspaceKey);

  const { data: allTestDetails } = useNoExpiredRequest(
    async () => {
      // 请求所有的用例数据
      const { list } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
        },
        descending: [],
        onlySelectId: false,
      });

      return list;
    },
    {
      cacheKey: `folder_tree_data_workspaceKey${workspaceKey}`,
      refreshDeps: [folderTreeNodes, workspaceKey],
    },
  );

  const { data: treeData, refresh: refreshTreeData } = useRequest(
    async () => {
      let processChain: CollectionChain<any> = _.chain(allTestDetails);

      // 如果有用例 id 范围，则过滤用例
      if (scopedTestDetailIds) {
        const scopedTestDetailIdSet = new Set(scopedTestDetailIds);
        processChain = processChain.filter(test => scopedTestDetailIdSet.has(test.objectId));
      }

      const repositoryTestDetailIdMap = processChain
        .reduce((map, test) => {
          const repositoryId = test.repository ?? UNGROUPED_FOLDER_KEY;
          const existedTestDetailIds = map.get(repositoryId) ?? [];
          map.set(repositoryId, [...existedTestDetailIds, test.objectId].filter(Boolean));
          return map;
        }, new Map())
        .value();

      const notExistedFolderKeySet = new Set([...repositoryTestDetailIdMap.keys()]);
      // 处理 repository 被删除的数据
      traverseTreeNodes(folderTreeNodes, node => {
        notExistedFolderKeySet.delete(node.key);
      });

      let unGroupedFolderIds = repositoryTestDetailIdMap.get(UNGROUPED_FOLDER_KEY) ?? [];
      notExistedFolderKeySet.forEach(key => {
        unGroupedFolderIds = unGroupedFolderIds.concat(repositoryTestDetailIdMap.get(key));
      });

      repositoryTestDetailIdMap.set(
        UNGROUPED_FOLDER_KEY,
        Array.from(new Set(unGroupedFolderIds)).filter(Boolean),
      );

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

  React.useImperativeHandle(
    actionRef,
    () => ({
      filterFolder(text) {
        // 重置 matched
        setMatchedFolderText({});
        text = text?.trim();
        const needExpandedKeys = [];
        if (text) {
          const matchRegExp = escapeMatchesQueryArg(text, ['i', 'g']);
          const matchedText = {};
          traverseTreeNodes(treeData, node => {
            const matched = node.name?.match(matchRegExp);
            if (matched) {
              matchedText[node.key] = matched[0];
              needExpandedKeys.push(node.key);
            }
          });
          setMatchedFolderText(matchedText);
        } else {
          // 无输入项，重置选中元素的父级
          const selectedNode = getTreeNodeByKey(treeData, treeSelectedKeys[0]);
          reverseTreeNodes(treeData, selectedNode, node => {
            needExpandedKeys.push(node.key);
          });
        }
        setAutoExpandParent(true);
        setTreeExpandedKeys(needExpandedKeys);
      },
      restFilter() {
        // 重置 matched
        setMatchedFolderText({});
        setAutoExpandParent(false);
        setTreeExpandedKeys([UNGROUPED_FOLDER_KEY]);
      },
      refresh() {
        refreshTreeData();
      },
    }),
    [treeData, treeSelectedKeys],
  );

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

      onFolderSelect?.(scopedTestDetailIds, {
        selectedFolder,
      });
    }
  }, [treeSelectedKeys, treeData, shouldIncludeSubFolder]);

  // 树节点渲染
  const titleRender = useMemoizedFn(node => {
    const [currentNum, childNodeNum] = node.amount;
    const matchedText = matchedFolderText[node.key];
    const matchedClassName = cx('matched');
    const highlightMatchedNodeName = matchedText
      ? node.name.replace(matchedText, `<span class="${matchedClassName}">${matchedText}</span>`)
      : `<span>${node.name}</span>`;

    return (
      <>
        <OverflowTooltip className={cx('tree-node-tips')} title={node.name}>
          <span
            className={cx('tree-node-name', Boolean(matchedText) && 'highlight')}
            dangerouslySetInnerHTML={{ __html: highlightMatchedNodeName }}
          />
        </OverflowTooltip>

        <span className={cx('tree-node-length')}>{`${currentNum}(${childNodeNum})`}</span>
      </>
    );
  });

  const handleTreeExpand = useMemoizedFn(expandedKeys => {
    setAutoExpandParent(false);
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

  return (
    <div>
      <DirectoryTree
        treeData={treeData}
        expandAction={false}
        className={cx('tree')}
        titleRender={titleRender}
        onExpand={handleTreeExpand}
        onSelect={handleTreeSelect}
        selectedKeys={treeSelectedKeys}
        expandedKeys={treeExpandedKeys}
        autoExpandParent={autoExpandParent}
        onRightClick={handleTreeRightClick}
        icon={({ expanded }) => (expanded ? <FileOpen /> : <FileClose />)}
        switcherIcon={<CaretDownOutlined style={{ color: '#878C96' }} />}
      />
    </div>
  );
};

export default RepositoryTree;
