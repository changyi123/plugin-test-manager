import React from 'react';
import Tree, { TreeDataNode } from '@osui/tree';
import cx from './index.less';
import { useReactive } from 'ahooks';
import { Button } from '@osui/ui';
import { IconPlusOutlined, IconDownOutlined, IconMoreOutlined } from '@osui/icons';
import { hasArrayItem } from '@/lib/utils/helper';
import ContextMenu, { openContextMenu } from '../ContextMenu';

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
  onSelect(indexes: number[], itemIds: string[]): void;
};

const FolderTree: React.FC<FolderTreeProps> = ({ structure, onSelect, className }) => {
  const state = useReactive({
    expandedKeys: [],
    selectedKeys: [],
  });

  const treeData = React.useMemo(() => {
    const traverseTreeNode = (nodes): TreeDataNode[] => {
      return nodes
        .map(node => {
          if (!node) return node;
          if (hasArrayItem(node.children)) {
            node.children = traverseTreeNode(node.children);
          }
          if (!hasArrayItem(node.itemIds)) {
            return null;
          }
          return node;
        })
        .filter(Boolean);
    };

    return traverseTreeNode(structure);
  }, [structure]);

  const handleRightClick = React.useCallback(({ event, node }) => {
    event.preventDefault();
    openContextMenu(event.target, { x: event.clientX, y: event.clientY });
  }, []);

  const handleExpand = React.useCallback(
    expandedKeys => {
      state.expandedKeys = expandedKeys;
    },
    [state],
  );

  const handleSelect = React.useCallback(
    (selectedKeys, { selected, node }) => {
      state.selectedKeys = selectedKeys;
      if (selected) {
        const indexes = node.pos.split('-');
        indexes.shift();
        onSelect(indexes, node.itemIds);
      }
    },
    [onSelect, state],
  );

  React.useEffect(() => {
    if (hasArrayItem(treeData)) {
      const node = treeData[0];
      handleExpand([node.key]);
      handleSelect([node.key], {
        selected: true,
        node: {
          pos: '0-0',
          ...node,
        },
      });
    }
  }, [handleSelect, treeData, handleExpand]);

  const ToolKitButtons = [
    {
      title: '创建目录',
      icon: <IconPlusOutlined />,
      onClick() {},
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
      icon: (
        <ContextMenu onMenuClick={console.log} trigger={['click']}>
          <IconMoreOutlined />
        </ContextMenu>
      ),
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
        treeData={treeData}
        className={cx('tree')}
        onExpand={handleExpand}
        onSelect={handleSelect}
        onRightClick={handleRightClick}
        selectedKeys={state.selectedKeys}
        expandedKeys={state.expandedKeys}
      />
    </div>
  );
};

export default React.memo(FolderTree);
