import React from 'react';
import { uniq } from 'lodash';
import { useReactive, useDrop } from 'ahooks';
import { Tree, Button, Modal, Input, message, Empty } from '@osui/ui';
import { hasArrayItem, getRootContainer } from '@/lib/utils/helper';
import { PlusCircleOutlined, MoreOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { openFolderMenu, MenuKey, FolderMenuWithDropdown } from '../Menu';
import { createFolder, updateFolders, deleteFolder } from '@/lib/api/repository';
import { useTestConfig, useBaseAction, useEventBus } from '@/lib/hooks/useContext';
import { useTreeFn, traverseTreeNodes } from './hook';
import { TestType } from '@/lib/constants';

import cx from './index.less';

const { DirectoryTree } = Tree;
// antd hover className
const AntdHoveringClassName = 'ant-tree-treenode-hovering';
const AntdTreeNodeClassName = 'ant-tree-treenode';
// antd tree component
const removeHoveringClassName = () => {
  const treeNodeDOMList = document.querySelectorAll(`.${AntdTreeNodeClassName}`);
  treeNodeDOMList.forEach(dom => {
    dom.className = dom.className.replace(AntdHoveringClassName, '');
  });
};
const appendHoveringClassName = target => {
  const treeNodeDOMList = document.querySelectorAll(`.${AntdTreeNodeClassName}`);
  const treeNodeDOM = Array.from(treeNodeDOMList).find(dom => dom.contains(target));
  const isExistedHoveringClassName =
    treeNodeDOM && !treeNodeDOM.className.includes(AntdHoveringClassName);
  if (isExistedHoveringClassName) {
    treeNodeDOM.className = `${treeNodeDOM.className} ${AntdHoveringClassName}`;
  }
};

type OpenFolderNameModal = (args: { title: string; name?: string }) => Promise<string>;

const openFolderNameModal: OpenFolderNameModal = ({ title, name }) => {
  let inputRef = null;
  const inputProps = {
    ref: ele => (inputRef = ele),
    defaultValue: name,
    placeholder: '请输入模块名',
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
          message.error('模块名不能为空');
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
  onSelect(node: TreeNode, breadcrumbs: string[]): void;
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

  const treeFn = useTreeFn(treeNodeData);

  const { itemCreated$ } = useEventBus();
  const isInitialRef = React.useRef(false);
  const {
    workspaceId,
    config: { itemTypeMap },
  } = useTestConfig();

  // 监听事项创建成功
  itemCreated$.useSubscription(async ({ itemId, folderKey }) => {
    console.info('itemCreated', itemId, folderKey);
    const node = treeFn.getTreeNodeByKey(folderKey);
    if (!node) return;
    // 修改 node，将创建成功的 itemId 追加到 node 上
    node.itemIds = (node.itemIds || []).concat(itemId);
    await updateFolders([node]);
    onFolderTreeChange();
    handleSelect([node.key], {
      selected: true,
      node: node,
    });
  });

  const { createItem } = useBaseAction();
  const [props] = useDrop({
    async onDom(content, e) {
      removeHoveringClassName();
      const { selectedFolderKey, itemId } = content;
      const targetNodeKey = e.currentTarget.getAttribute('data-node-key');
      // 相同模块不执行操作
      if (selectedFolderKey === targetNodeKey) return;
      const currentNode = treeFn.getTreeNodeByKey(selectedFolderKey);
      const targetNode = treeFn.getTreeNodeByKey(targetNodeKey);

      currentNode.itemIds = currentNode.itemIds.filter(key => key !== itemId);
      targetNode.itemIds = targetNode.itemIds.concat(itemId);

      await updateFolders([currentNode, targetNode]);

      message.success('测试用例移动成功');
      onFolderTreeChange();
      handleSelect([currentNode.key], {
        selected: true,
        node: currentNode,
      });
    },
  });

  const selectedTreeNode = React.useMemo(() => {
    return treeFn.getTreeNodeByKey(state.selectedKeys[0]);
  }, [treeFn, state.selectedKeys]);

  const treeData = React.useMemo(() => {
    return treeFn.traverseTreeNodes(node => {
      let totalLen = 0;
      traverseTreeNodes([node], node => {
        totalLen += node.itemIds.length;
      });
      node.title = (
        <div
          {...props}
          data-node-key={node.key}
          className={cx('tree-node')}
          onDragOver={event => {
            appendHoveringClassName(event.currentTarget);
            // eslint-disable-next-line react/prop-types
            props.onDragOver(event);
          }}
          onDragLeave={event => {
            removeHoveringClassName();
            // eslint-disable-next-line react/prop-types
            props.onDragLeave(event);
          }}
        >
          <span>{node.name}</span>
          <span className={cx('tree-node-length')}>{`${node.itemIds.length} (${totalLen})`}</span>
        </div>
      );
    });
  }, [treeFn, props]);

  const folderMenuDisabledKeys = React.useMemo(() => {
    const keys = [];
    if (!itemTypeMap?.Test) {
      keys.push(MenuKey.createTest);
    }
    return keys;
  }, [itemTypeMap]);

  // 展开子菜单
  const expandSubFolder = React.useCallback(
    key => {
      const currentNode = treeFn.getTreeNodeByKey(key);
      const keys = [];
      traverseTreeNodes([currentNode], node => {
        keys.push(node.key);
      });
      if (hasArrayItem(keys)) {
        state.expandedKeys = uniq(state.expandedKeys.concat(keys));
      }
    },
    [state, treeFn],
  );

  const handleSelect = React.useCallback(
    (selectedKeys, { selected, node }) => {
      state.selectedKeys = selectedKeys;
      if (selected) {
        const breadcrumbs = [];
        treeFn.reverseTreeNodes(node, n => {
          breadcrumbs.unshift(n.name);
        });
        onSelect(node, breadcrumbs);
      }
    },
    [onSelect, state, treeFn],
  );

  /** 右键菜单处理函数 */
  const handleMenuClick = React.useCallback(
    async (actionKey: MenuKey, node?: TreeNode) => {
      if (actionKey === MenuKey.createFolder) {
        let hierarchy = 0;
        treeFn.reverseTreeNodes(node, () => {
          hierarchy++;
        });
        // 模块创建限制 5 个层级
        if (hierarchy >= 5) {
          message.warn('限制5个层级，5个层级以上不能新建子模块');
          return;
        }
        const folderName = await openFolderNameModal({ title: '创建模块' });
        await createFolder({
          parentId: node?.key,
          workspaceId,
          name: folderName,
        });
        node?.key && state.expandedKeys.push(node.key);
        message.success('模块创建成功');
      } else if (actionKey === MenuKey.renameFolder) {
        const newFolderName = await openFolderNameModal({
          title: '修改模块名',
          name: node.name,
        });

        await updateFolders([
          {
            key: node.key,
            name: newFolderName,
          },
        ]);
        message.success(`模块重命被为${newFolderName}`);
      } else if (actionKey === MenuKey.deleteFolder) {
        Modal.confirm({
          getContainer: getRootContainer,
          title: '提醒',
          content: '当前操作会使改模块的所有子模块会被删除，是否继续执行？',
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
            message.success('模块删除成功');
            onFolderTreeChange();
            const parentNode = treeFn.getTreeNodeByKey(node.parentId);
            if (parentNode) {
              // 删除后选中模块置于被删除模块的父级
              handleSelect([node.parentId], {
                selected: true,
                node: parentNode,
              });
            }
          },
        });
      } else if (actionKey === MenuKey.expandFolder) {
        expandSubFolder(node.key);
      } else if (actionKey === MenuKey.createTest) {
        // 创建测试用例
        createItem({
          type: TestType.Test,
          extraData: {
            type: TestType.Test,
            folderKey: node.key,
          },
        });
      }

      const NeedRefreshActionKeys = [MenuKey.createFolder, MenuKey.renameFolder];
      if (NeedRefreshActionKeys.includes(actionKey)) {
        onFolderTreeChange();
      }
    },
    [
      treeFn,
      workspaceId,
      state.expandedKeys,
      onFolderTreeChange,
      handleSelect,
      expandSubFolder,
      createItem,
    ],
  );

  const handleRightClick = React.useCallback(
    ({ event, node }) => {
      event.preventDefault();
      openFolderMenu(event.target, {
        x: event.clientX,
        y: event.clientY,
        onClick: (key: MenuKey) => handleMenuClick(key, node),
        disabledKeys: folderMenuDisabledKeys,
      });
    },
    [handleMenuClick, folderMenuDisabledKeys],
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
      // 默认展开模块第一层
      handleExpand([node.key]);
      handleSelect([node.key], {
        node,
        selected: true,
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
            <p>模块为空</p>
            <p className={cx('hint')}>请先新建模块</p>
          </>
        }
      >
        <Button type="primary" onClick={() => handleMenuClick(MenuKey.createFolder)}>
          新建模块
        </Button>
      </Empty>
    );
  }, [handleMenuClick, loading]);

  const ToolKitButtons = [
    {
      title: '创建模块',
      icon: <PlusCircleOutlined />,
      onClick() {
        handleMenuClick(MenuKey.createFolder, selectedTreeNode);
      },
    },
    {
      title: '折叠全部',
      icon: <FullscreenExitOutlined />,
      onClick() {
        state.expandedKeys = [];
      },
    },
    {
      title: '更多',
      icon: (
        <FolderMenuWithDropdown
          trigger={['click']}
          onMenuClick={key => handleMenuClick(key, selectedTreeNode || {})}
          disabledKeys={folderMenuDisabledKeys}
        >
          <MoreOutlined />
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
