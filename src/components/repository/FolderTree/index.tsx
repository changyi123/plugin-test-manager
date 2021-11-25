import React from 'react';
import Tree, { TreeDataNode } from '@osui/tree';
import cx from './index.less';
import { useReactive } from 'ahooks';
import { Button, Modal, Input, message } from '@osui/ui';
import { hasArrayItem, getRootContainer } from '@/lib/utils/helper';
import { IconPlusOutlined, IconDownOutlined, IconMoreOutlined } from '@osui/icons';
import { openFolderMenu, MenuKey, FolderMenuWithDropdown } from '../Menu';
import repositoryApi from '@/lib/api/repository';
import { useConfigContext } from '@/lib/hooks/useConfig';

const { DirectoryTree } = Tree;

type openFolderNameModalParams = { title: string; name?: string };

const openFolderNameModal = ({ title, name }: openFolderNameModalParams) => {
  let inputRef = null;
  const inputProps = {
    ref: ele => (inputRef = ele),
    defaultValue: name || '未命名目录',
    placeholder: '请输入目录名',
    maxLength: 40,
  };
  const input = <Input {...inputProps} />;
  return new Promise((resolve, reject) => {
    Modal.confirm({
      getContainer: getRootContainer,
      title,
      icon: null,
      content: input,
      onOk() {
        resolve(inputRef.state.value);
      },
      onCancel() {
        reject();
      },
    });
  });
};

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

  const { workspaceId } = useConfigContext();

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

  // 菜单处理
  const handleMenuClick = React.useCallback(
    async (actionKey: MenuKey, context?: { folderId?: string }) => {
      if (actionKey === MenuKey.createFolder) {
        openFolderNameModal({ title: '创建目录' });
        // await repositoryApi.createFolder({
        //   parentId: context.folderId,
        //   workspaceId,
        //   name: '',
        // });
      }
    },
    [],
  );

  const handleRightClick = React.useCallback(({ event, node }) => {
    event.preventDefault();
    openFolderMenu(event.target, {
      x: event.clientX,
      y: event.clientY,
      onClick: console.log,
    });
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
        <FolderMenuWithDropdown
          onMenuClick={key => handleMenuClick(key, { folderId: state.expandedKeys[0] })}
          trigger={['click']}
        >
          <IconMoreOutlined />
        </FolderMenuWithDropdown>
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
