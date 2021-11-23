import React from 'react';
import Tree, { TreeDataNode } from '@osui/tree';
import cx from './index.less';
import { useReactive } from 'ahooks';
import { Button } from '@osui/ui';
import { IconPlusOutlined, IconDownOutlined, IconMoreOutlined } from '@osui/icons';

const { DirectoryTree } = Tree;

type TreeNode = {
  key: string;
  title: string;
  itemIds: string[];
  children: TreeNode[];
};

type FolderTreeProps = {
  className?: string;
  structure: TreeNode[];
  onSelect(pos: string, itemIds: string[]): void;
};

const FolderTree: React.FC<FolderTreeProps> = ({ structure, onSelect, className }) => {
  const state = useReactive({
    expandedKeys: [],
    selectedKey: '',
  });

  const treeData = React.useMemo(() => {
    const hasItem = (arr?: unknown[]) => Boolean(Array.isArray(arr) && arr.length);

    const traverseTreeNode = (nodes): TreeDataNode[] => {
      return nodes
        .map(node => {
          if (!node) return node;
          if (hasItem(node.children)) {
            node.children = traverseTreeNode(node.children);
          }
          if (!hasItem(node.itemIds)) {
            return null;
          }
          return node;
        })
        .filter(Boolean);
    };

    return traverseTreeNode(structure);
  }, [structure]);

  const handleRightClick = React.useCallback(({ event }) => {
    event.preventDefault();
  }, []);

  const handleExpand = React.useCallback(
    (expandedKeys, { expanded, node }) => {
      state.expandedKeys = expandedKeys;
      if (expanded) {
        state.selectedKey = node.key;
        onSelect(node.pos, node.itemIds);
      }
    },
    [onSelect],
  );

  const ToolKitButtons = [
    {
      title: '创建目录',
      icon: <IconPlusOutlined />,
      onClick() {
        console.log(state.selectedKey);
      },
    },
    {
      title: '折叠全部',
      icon: <IconDownOutlined />,
      onClick() {
        state.expandedKeys = [];
      },
    },
    {
      title: '更多',
      icon: <IconMoreOutlined />,
    },
  ];

  return (
    <div className={cx('folder-tree', className)}>
      <div className={cx('toolkit-bar')}>
        {ToolKitButtons.map(button => (
          <Button
            key={button.title}
            onClick={button?.onClick}
            title={button.title}
            icon={button.icon}
            size="small"
          />
        ))}
      </div>
      <DirectoryTree
        className={cx('tree')}
        treeData={treeData}
        onExpand={handleExpand}
        onRightClick={handleRightClick}
        expandedKeys={state.expandedKeys}
      />
    </div>
  );
};

export default React.memo(FolderTree);
