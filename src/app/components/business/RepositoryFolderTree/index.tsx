/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import { Spin, Tree } from 'antd';
import { FileOpen, FileClose, CaretDownOutlined } from '@/icons';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { UNGROUPED_FOLDER_KEY } from '@/pages/repository/constant';
import { hasArrayItem, escapeMatchesQueryArg } from '@/lib/utils/helper';
import { useRequest, useMemoizedFn, useDeepCompareEffect, clearCache } from 'ahooks';
import { traverseTreeNodes, getTreeNodeByKey, reverseTreeNodes } from '@/pages/repository/util';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { getRepositoryTreeV2 } from '@/lib/api/item';
import { QueryLinkedTestEntityPayload } from 'common/types/api';

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
  onFolderSelect?: (node?: any) => void;
  /** 隐藏空节点 */
  hideEmptyFolder?: boolean;
  actionRef?: React.ForwardedRef<ActionType>;
  params?: QueryLinkedTestEntityPayload;
  isShowAll?: boolean;
  cacheKey?: string;
  isModelTree?: boolean;
};

const RepositoryTree: React.FC<RepositoryTreeProps> = props => {
  const {
    actionRef,
    workspaceKey,
    onFolderSelect,
    params,
    hideEmptyFolder,
    isShowAll = true,
  } = props;
  const [treeSelectedKeys, setTreeSelectedKeys] = React.useState([]);
  const [treeExpandedKeys, setTreeExpandedKeys] = React.useState([]);
  const isFirstFolderActivatedRef = React.useRef(false);
  const [autoExpandParent, setAutoExpandParent] = React.useState(true);
  // 匹配的目录名
  const [matchedFolderText, setMatchedFolderText] = React.useState({});

  const {
    data: treeData,
    loading: treeLoading,
    refresh: refreshTreeData,
  } = useRequest(
    async () => {
      if (!workspaceKey) return [];
      if (!isShowAll && !params) return [];
      const { data } = await getRepositoryTreeV2({
        workspaceKey,
        params,
      });

      return hideEmptyFolder ? filterEmptyFolder([data]) : [data];
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [workspaceKey, JSON.stringify(params), hideEmptyFolder, isShowAll],
    },
  );

  useEffect(() => {
    return () => {
      clearCache(`${workspaceKey}-node-tree-data`);
    };
  }, [workspaceKey]);

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
      refresh: () => {
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
    onFolderSelect?.(selectedFolder);
  }, [treeSelectedKeys, treeData, hideEmptyFolder]);

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

  useListener('refreshSelectedNode', () => {
    handleTreeSelect(['root']);
  });

  return (
    <Spin spinning={treeLoading}>
      <DirectoryTree
        treeData={treeData}
        expandAction={false}
        className={cx('tree', treeLoading ? 'tree-hide' : '')}
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
