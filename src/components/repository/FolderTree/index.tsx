import React from 'react';
import cx from './index.less';
import { useReactive } from 'ahooks';
import { Tree, Button, Modal, Input, message, Empty } from '@osui/ui';
import { hasArrayItem, getRootContainer } from '@/lib/utils/helper';
import { IconPlusOutlined, IconDownOutlined, IconMoreOutlined } from '@osui/icons';
import { openFolderMenu, MenuKey, FolderMenuWithDropdown } from '../Menu';
import { createFolder, updateFolder, deleteFolder } from '@/lib/api/repository';
import { useConfigContext } from '@/lib/hooks/useConfig';
import { uniq } from 'lodash';

const { DirectoryTree } = Tree;

type OpenFolderNameModal = (args: { title: string; name?: string }) => Promise<string>;

const openFolderNameModal: OpenFolderNameModal = ({ title, name }) => {
  let inputRef = null;
  const inputProps = {
    ref: ele => (inputRef = ele),
    defaultValue: name,
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
        const inputValue = inputRef.state.value;
        if (!inputValue) {
          message.error('目录名不能为空');
          throw new Error('required name');
        }
        resolve(inputValue);
      },
      onCancel() {
        reject();
      },
    });
  });
};

type TreeNode = {
  key: string;
  name: string;
  title: React.ReactNode;
  parentId: string | null;
  itemIds: string[];
  children: TreeNode[];
};

type FolderTreeProps = {
  loading?: boolean;
  className?: string;
  treeNodeData: TreeNode[];
  onFolderTreeChange?: () => void;
  onSelect(itemIds: string[], breadcrumbs: string[]): void;
};

/**
 * 遍历树节点
 */
const traverseTreeNodes = (nodes: TreeNode[], cb?: (node: TreeNode) => TreeNode | void) => {
  if (!hasArrayItem(nodes)) return;
  nodes.forEach(node => {
    const newNode = cb?.(node);
    if (newNode) {
      node = newNode;
    }
    traverseTreeNodes(node.children, cb);
  });
  return nodes;
};

/**
 * 获取树节点
 */
const getTreeNodeByKey = (nodes: TreeNode[], key) => {
  let result = null;
  traverseTreeNodes(nodes, node => {
    if (node.key === key) {
      result = node;
    }
  });
  return result;
};

const FolderTree: React.FC<FolderTreeProps> = ({
  treeNodeData,
  onSelect,
  loading,
  className,
  onFolderTreeChange,
}) => {
  const state = useReactive({
    expandedKeys: [],
    selectedKeys: [],
  });

  const isInitialRef = React.useRef(false);
  const { workspaceId } = useConfigContext();

  const selectedTreeNode = React.useMemo(() => {
    return getTreeNodeByKey(treeNodeData, state.selectedKeys[0]);
  }, [treeNodeData, state.selectedKeys]);

  const treeData = React.useMemo(() => {
    return traverseTreeNodes(treeNodeData, node => {
      let totalLen = 0;
      traverseTreeNodes([node], node => {
        totalLen += node.itemIds.length;
      });
      node.title = (
        <>
          <span>{node.name}</span>
          <span className={cx('tree-node-length')}>{`${node.itemIds.length} (${totalLen})`}</span>
        </>
      );
    });
  }, [treeNodeData]);

  // 展开子菜单
  const expandSubFolder = React.useCallback(
    key => {
      const currentNode = getTreeNodeByKey(treeNodeData, key);
      const keys = [];
      traverseTreeNodes([currentNode], node => {
        keys.push(node.key);
      });
      if (hasArrayItem(keys)) {
        state.expandedKeys = uniq(state.expandedKeys.concat(keys));
      }
    },
    [state, treeNodeData],
  );

  const handleSelect = React.useCallback(
    (selectedKeys, { selected, node }) => {
      state.selectedKeys = selectedKeys;
      if (selected) {
        const nodeKeyMap = {};
        traverseTreeNodes(treeNodeData, node => {
          Object.assign(nodeKeyMap, { [node.key]: node });
        });
        let currentNode = node;
        const breadcrumbs = [];
        // 逆向遍历查找 node 节点 name
        while (currentNode) {
          if (currentNode) {
            breadcrumbs.unshift(currentNode.name);
            currentNode = nodeKeyMap[currentNode.parentId];
          }
        }

        onSelect(node.itemIds, breadcrumbs);
      }
    },
    [onSelect, state, treeNodeData],
  );

  // 右键菜单处理函数
  const handleMenuClick = React.useCallback(
    async (actionKey: MenuKey, node?: TreeNode) => {
      if (actionKey === MenuKey.createFolder) {
        const folderName = await openFolderNameModal({ title: '创建目录' });
        await createFolder({
          parentId: node?.key,
          workspaceId,
          name: folderName,
        });
        node?.key && state.expandedKeys.push(node.key);
        message.success('目录创建成功');
      } else if (actionKey === MenuKey.renameFolder) {
        const newFolderName = await openFolderNameModal({
          title: '修改目录名',
          name: node.name,
        });

        await updateFolder({
          id: node.key,
          name: newFolderName,
        });
        message.success(`目录重命被为${newFolderName}`);
      } else if (actionKey === MenuKey.deleteFolder) {
        Modal.confirm({
          getContainer: getRootContainer,
          title: '提醒',
          content: '当前操作会使改目录的所有子目录会被删除，是否继续执行？',
          okText: '继续',
          okButtonProps: {
            type: 'default',
            danger: true,
          },
          cancelButtonProps: {
            type: 'primary',
          },
          onOk: async () => {
            const keys = [];
            traverseTreeNodes([node], node => {
              keys.push(node.key);
            });
            await deleteFolder(keys);
            message.success('目录删除成功');
            onFolderTreeChange();
            const parentNode = getTreeNodeByKey(treeNodeData, node.parentId);
            if (parentNode) {
              // 删除后选中目录置于被删除目录的父级
              handleSelect([node.parentId], {
                selected: true,
                node: parentNode,
              });
            }
          },
        });
      } else if (actionKey === MenuKey.expandFolder) {
        expandSubFolder(node.key);
      }

      const NeedRefreshActionKeys = [MenuKey.createFolder, MenuKey.renameFolder];
      if (NeedRefreshActionKeys.includes(actionKey)) {
        onFolderTreeChange();
      }
    },
    [
      workspaceId,
      state.expandedKeys,
      onFolderTreeChange,
      handleSelect,
      treeNodeData,
      expandSubFolder,
    ],
  );

  const handleRightClick = React.useCallback(
    ({ event, node }) => {
      event.preventDefault();
      openFolderMenu(event.target, {
        x: event.clientX,
        y: event.clientY,
        onClick: (key: MenuKey) => handleMenuClick(key, node),
      });
    },
    [handleMenuClick],
  );

  const handleExpand = React.useCallback(
    expandedKeys => {
      state.expandedKeys = expandedKeys;
    },
    [state],
  );

  React.useEffect(() => {
    if (hasArrayItem(treeData) && !isInitialRef.current) {
      isInitialRef.current = true;
      const node = treeData[0];
      // 默认展开目录第一层
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

  const EmptyElement = React.useMemo(() => {
    if (loading) return null;
    return (
      <Empty
        className={cx('empty')}
        description={
          <>
            <p>目录为空</p>
            <p className={cx('hint')}>请先新建目录</p>
          </>
        }
      >
        <Button type="primary" onClick={() => handleMenuClick(MenuKey.createFolder)}>
          新建目录
        </Button>
      </Empty>
    );
  }, [handleMenuClick, loading]);

  const ToolKitButtons = [
    {
      title: '创建目录',
      icon: <IconPlusOutlined />,
      onClick() {
        handleMenuClick(MenuKey.createFolder, selectedTreeNode);
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
      icon: (
        <FolderMenuWithDropdown
          onMenuClick={key => handleMenuClick(key, selectedTreeNode || {})}
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
      {hasArrayItem(treeData) ? (
        <DirectoryTree
          treeData={treeData}
          className={cx('tree')}
          onExpand={handleExpand}
          onSelect={handleSelect}
          onRightClick={handleRightClick}
          selectedKeys={state.selectedKeys}
          expandedKeys={state.expandedKeys}
        />
      ) : (
        EmptyElement
      )}
    </div>
  );
};

export default React.memo(FolderTree);
