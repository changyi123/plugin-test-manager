/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo } from 'react';
import { Spin, Tree } from 'antd';
import { FileOpen, FileClose, CaretDownOutlined } from '@/icons';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { UNGROUPED_FOLDER_KEY } from '@/pages/repository/constant';
import { hasArrayItem, escapeMatchesQueryArg } from '@/lib/utils/helper';
import { useRequest, useMemoizedFn, useDeepCompareEffect } from 'ahooks';
import { traverseTreeNodes, getTreeNodeByKey, reverseTreeNodes } from '@/pages/repository/util';
import { getRepositoryTree } from '@/lib/api/item';
import { RepositoryModel } from '@/lib/constants';
import { cloneDeep } from 'lodash';

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
  /** 筛选器字段 */
  selectors?: any[];
  /** 用例 id 范围 */
  scopedTestDetailIds?: string[];
  /** 目录被选中 */
  onFolderSelect?: (
    testDetailIds: string[],
    extraData: {
      selectedFolder: any;
    },
  ) => void;
  /** 隐藏空节点 */
  hideEmptyFolder?: boolean;
  actionRef?: React.ForwardedRef<ActionType>;
};

const RepositoryTree: React.FC<RepositoryTreeProps> = props => {
  const {
    actionRef,
    workspaceKey,
    selectors,
    onFolderSelect,
    hideEmptyFolder,
    scopedTestDetailIds,
    shouldIncludeSubFolder = true,
  } = props;
  const [treeSelectedKeys, setTreeSelectedKeys] = React.useState([]);
  const [treeExpandedKeys, setTreeExpandedKeys] = React.useState([]);
  const isFirstFolderActivatedRef = React.useRef(false);
  const [autoExpandParent, setAutoExpandParent] = React.useState(true);
  // 匹配的目录名
  const [matchedFolderText, setMatchedFolderText] = React.useState({});
  const selectorRepository = useMemo(() => {
    const [, customSelector] = selectors ?? [];
    if (customSelector?.[RepositoryModel]) {
      return customSelector?.[RepositoryModel]?.value?.map(d => d.objectId) ?? [];
    }
    return null;
  }, [selectors]);

  const { data: nodeTreeData, loading: getTreeLoading } = useRequest(
    async () => {
      if (!workspaceKey) return {};
      const { data } = await getRepositoryTree({
        workspaceKey,
      });

      return data;
    },
    {
      refreshDeps: [workspaceKey],
      cacheKey: `${workspaceKey}-node-tree-data`,
      cacheTime: 999999999,
      staleTime: 999999999,
    },
  );

  const {
    data: treeData,
    refresh: refreshTreeData,
    loading,
  } = useRequest(
    async () => {
      if (!nodeTreeData || !scopedTestDetailIds?.length) return [];
      const nodeData = [cloneDeep(nodeTreeData)];

      if (hideEmptyFolder) {
        const getCaseIds = caseIds => caseIds?.filter(d => (scopedTestDetailIds ?? []).includes(d));

        traverseTreeNodes(nodeData, node => {
          const testDetailIds = getCaseIds(node.caseIds);
          let childTestDetailNum = 0;
          // 递归子目录获取数量（包含当前节点）
          traverseTreeNodes([node], child => {
            const num = getCaseIds(child.caseIds).length;
            childTestDetailNum += num;
          });
          const amount = [testDetailIds.length, childTestDetailNum];
          node.counts = amount;
          node.caseIds = testDetailIds;
        });
        // 过滤为空的目录
        const filterEmptyFolder = folders => {
          if (Array.isArray(folders)) {
            return folders
              .filter(folder => {
                const [, childTestDetailNum] = folder.counts;
                return childTestDetailNum > 0;
              })
              .map(folder => {
                folder.children = filterEmptyFolder(folder.children);
                return folder;
              });
          } else {
            return folders;
          }
        };

        return filterEmptyFolder(nodeData);
      }

      return nodeData;
    },
    {
      refreshDeps: [workspaceKey, scopedTestDetailIds, hideEmptyFolder, nodeTreeData],
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
    let caseIds = [];
    if (selectedFolder) {
      // 包含所有子集节点的用例
      if (shouldIncludeSubFolder) {
        traverseTreeNodes([selectedFolder], node => {
          if (selectorRepository?.length) {
            const _node = selectorRepository.includes(node.key) ? node : null;
            caseIds = caseIds.concat(_node?.caseIds ?? []);
          } else {
            caseIds = caseIds.concat(node.caseIds);
          }
        });
      } else {
        if (selectorRepository?.length) {
          caseIds = selectedFolder.caseIds;
        } else {
          caseIds = selectedFolder.caseIds;
        }
      }
    }

    onFolderSelect?.(caseIds, {
      selectedFolder,
    });
  }, [treeSelectedKeys, treeData, shouldIncludeSubFolder, selectorRepository]);

  // 树节点渲染
  const titleRender = useMemoizedFn(node => {
    const [currentNum, childNodeNum] = node.counts;
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
    <Spin spinning={getTreeLoading || loading}>
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
    </Spin>
  );
};

export default RepositoryTree;
