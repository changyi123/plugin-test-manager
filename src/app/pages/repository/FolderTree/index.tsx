import React, { useCallback } from 'react';
import { sum, uniq } from 'lodash';
import { useReactive, useDrop } from 'ahooks';
import { TestType } from '@/lib/constants';
import {
  hasArrayItem,
  getRootContainer,
  getProximaBasePath,
  getTenantKey,
  inIframe,
} from '@/lib/utils/helper';
import { createFolder, updateFolders, deleteFolder } from '@/lib/api/repository';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import { traverseTreeNodes } from '../util';
import { useTreeFn } from '../hook';
import { MenuKey, FolderMenu } from '../Menu';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { Tree, Button, Input, notification, Dropdown, Modal, message } from 'antd';
import { updateTestEntity } from '@/lib/api/item';
import {
  CustomMore,
  CustomScreenOff,
  CustomPlus,
  CaretDownOutlined,
  FileClose,
  FileOpen,
} from '@/icons';
import { getTreeNodeByKey } from '../util';

import { UNGROUPED_FOLDER_KEY } from '../constant';

import cx from './index.less';

const { DirectoryTree } = Tree;

type OpenFolderNameModal = (args: {
  name?: string;
  title: string;
  validator?: (name) => void;
}) => Promise<string>;

const openFolderNameModal: OpenFolderNameModal = ({ title, name, validator }) => {
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
      title,
      icon: null,
      content: input,
      getContainer: getRootContainer,
      async onOk() {
        const inputValue = inputRef.input.value?.trim() ?? '';
        validator?.(inputValue);
        resolve(inputValue);
      },
      onCancel() {
        reject();
      },
    });
    setTimeout(() => {
      inputRef.focus({
        cursor: 'start',
      });
    });
  });
};

const DropTreeTitle = ({ children, nodeKey, onItemDrop }) => {
  const ref = React.useRef(null);
  const dragoverClassName = cx('ant-tree-treenode-dragover');
  useDrop(ref, {
    onDom(_, e) {
      const data = JSON.parse(e.dataTransfer.getData('data'));
      // if (data.folderKey === nodeKey) return;
      onItemDrop({
        testId: data.testId,
        fromFolderKey: data.folderKey,
        toFolderKey: nodeKey,
      });
      const treeElementNode = (e.target as any).closest('.ant-tree-treenode');
      treeElementNode.classList.remove(dragoverClassName);
    },
    onDragEnter(e) {
      const treeElementNode = (e.target as any).closest('.ant-tree-treenode');
      treeElementNode.classList.add(dragoverClassName);
    },
    onDragLeave(e) {
      const treeElementNode = (e.target as any).closest('.ant-tree-treenode');
      treeElementNode.classList.remove(dragoverClassName);
    },
  });
  return (
    <div ref={ref} data-node-key={nodeKey} className={cx('tree-node')}>
      {children}
    </div>
  );
};

const getTargetNodesSortIndex = (nodes, parentKey, dropKey) =>
  getTreeNodeByKey(nodes, parentKey)?.children?.reduce((prev, cur) => {
    if (prev.length === 1) {
      prev = prev.concat(cur.sortIndex);
    }
    if (cur.key === dropKey) {
      prev = prev.concat(cur.sortIndex);
    }
    return prev;
  }, []);

const getSortIndex = nodes => {
  if (!nodes?.length) return {};
  if (nodes.length === 1) {
    return { sortIndex: nodes[0] + 10e5 };
  }
  if (nodes.length === 2) {
    return { sortIndex: Math.floor(sum(nodes) / 2) };
  }
};

type TreeNode = {
  key: string;
  name: string;
  title: React.ReactNode;
  parentKey: string | null;
  caseIds: string[];
  children: TreeNode[];
};

type FolderTreeProps = {
  loading?: boolean;
  className?: string;
  treeNodeData: TreeNode[];
  onSelect(node: TreeNode): void;
  onFolderTreeChange?: () => Promise<any>;
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

  const isInitialRef = React.useRef(false);
  const {
    workspace,
    config: { itemTypeMap },
  } = useTestConfig();

  const { createItemUseModal } = useBaseAction();

  const selectedTreeNode = React.useMemo(() => {
    return treeFn.getTreeNodeByKey(state.selectedKeys[0]);
  }, [treeFn, state.selectedKeys]);

  const folderMenuDisabledKeys = React.useMemo(() => {
    const keys = [];
    if (!itemTypeMap?.TestCase) {
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
    (selectedKeys, { node }) => {
      state.selectedKeys = selectedKeys;
      onSelect(node);
    },
    [onSelect, state],
  );

  const inputNameValidator = React.useCallback((inputName, nodes) => {
    const nodeNames = nodes.map(n => n.name);
    if (nodeNames.includes(inputName)) {
      notification.error({
        message: '同一层级模块名不能重复',
      });
      throw new Error('can not set same name');
    }
    if (!inputName) {
      notification.error({
        message: '模块名不能为空',
      });
      throw new Error('required name');
    }
    if (inputName.length > 30) {
      notification.error({
        message: '模块名最多30字符',
      });
      throw new Error('max length');
    }
  }, []);

  /** 右键菜单处理函数 */
  const handleMenuClick = React.useCallback(
    async (actionKey: MenuKey, node?: TreeNode) => {
      if (actionKey === MenuKey.createFolder) {
        let hierarchy = 0;
        treeFn.reverseTreeNodes(node, () => {
          hierarchy++;
        });
        // 模块创建限制 8 个层级
        // 全部用例不算一个层级
        if (hierarchy >= 9) {
          notification.warn({
            message: '限制8个层级，8个层级以上不能新建子模块',
          });
          return;
        }
        const folderName = await openFolderNameModal({
          title: '新建子模块',
          validator: inputName => inputNameValidator(inputName, node.children),
        });
        const parentKey = node?.key === UNGROUPED_FOLDER_KEY ? null : node?.key;
        const createdFolder = await createFolder({
          name: folderName,
          workspaceKey: workspace?.key,
          // 忽略根目录 folder key
          parentKey,
        });
        node?.key && state.expandedKeys.push(node.key);
        const { objectId: createdFolderKey } = createdFolder.toJSON();
        await onFolderTreeChange();
        handleSelect([createdFolderKey], {
          node: {
            parentKey,
            caseIds: [],
            name: folderName,
            key: createdFolderKey,
          },
        });
        notification.success({
          message: '子模块新建成功',
        });
      } else if (actionKey === MenuKey.renameFolder) {
        const newFolderName = await openFolderNameModal({
          title: '重命名模块',
          name: node.name,
          validator: inputName => inputNameValidator(inputName, [node]),
        });

        await updateFolders([
          {
            key: node.key,
            name: newFolderName,
          },
        ]);
        notification.success({
          message: `模块重命被为【${newFolderName}】`,
        });
      } else if (actionKey === MenuKey.deleteFolder) {
        Modal.confirm({
          className: cx('confirm'),
          getContainer: getRootContainer,
          title: '删除模块',
          width: 500,
          content: (
            <>
              <div>确定删除【{node.name}】模块吗？</div>
              <div style={{ marginLeft: 14 }}>
                模块下的子模块将会一同删除，模块内的用例仍保留且自动移至未分组用例下。
              </div>
            </>
          ),
          okText: '删除',
          okButtonProps: {
            type: 'default',
            danger: true,
          },
          onOk: async () => {
            const keys = [];
            traverseTreeNodes([node], node => {
              keys.push(node.key);
            });
            await deleteFolder(keys);
            notification.success({
              message: '模块删除成功',
            });
            const refreshedTreeData = await onFolderTreeChange();
            const parentNode = getTreeNodeByKey(refreshedTreeData, node.parentKey);
            if (parentNode) {
              // 删除后选中模块置于被删除模块的父级
              handleSelect([node.parentKey], {
                node: parentNode,
              });
            } else {
              // 当前模块无父级需要冲选择到新模块
              handleSelect([UNGROUPED_FOLDER_KEY], {
                node: getTreeNodeByKey(refreshedTreeData, UNGROUPED_FOLDER_KEY),
              });
            }
          },
        });
      } else if (actionKey === MenuKey.expandFolder) {
        expandSubFolder(node.key);
      } else if (actionKey === MenuKey.createTest) {
        // 创建测试用例
        const { testEntityList } = await createItemUseModal({
          type: TestType.Case,
          extraData: {
            useItemBatchCreate: true,
            repository: node.key === UNGROUPED_FOLDER_KEY ? null : node.key,
          },
        });
        // const testEntityData = testEntity;
        // 创建的测试用例不在同一个空间
        // if (workspace?.key !== (item?.workspace as any)?.key) return;
        // 只有测试用例需要被添加至测试用例仓库
        // if (testEntityData.type !== TestType.Case) return;
        // 修改 node，将创建成功的 itemKey 追加到 node 上
        node.caseIds = (node.caseIds || []).concat(testEntityList.map(d => d.objectId));
        await updateFolders([node]);
        const successMessage =
          testEntityList.length > 1
            ? `${testEntityList.length}个测试用例新建成功`
            : `测试用例【${testEntityList[0]?.name}】新建成功`;
        notification.success({
          message: successMessage,
        });
        onFolderTreeChange();
        handleSelect([node.key], {
          node: node,
        });
      } else if (actionKey === MenuKey.importTest) {
        // iframe 中跳转链接增加隐藏 header 和 sider 属性
        const appendedQueryString = inIframe() ? '&hiddenSider=true&hiddenHeader=true' : '';
        const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
        // 跳转到导入页面
        const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspace.key}/import/${
          workspace.objectId
        }?app=test_manager&disableToggleWorkspace${appendedQueryString}&group=${
          node.key
        }&excludeFieldsKey=group`;
        window.open(href);
      }

      const NeedRefreshActionKeys = [MenuKey.renameFolder];
      if (NeedRefreshActionKeys.includes(actionKey)) {
        onFolderTreeChange();
      }
    },
    [
      treeFn,
      workspace,
      state.expandedKeys,
      onFolderTreeChange,
      handleSelect,
      inputNameValidator,
      expandSubFolder,
      createItemUseModal,
    ],
  );

  const handleRightClick = React.useCallback(({ event, node }) => {
    event.preventDefault();
    // 所有案例无右侧菜单
    if (node.key === UNGROUPED_FOLDER_KEY) return;
  }, []);

  const handleExpand = React.useCallback(
    expandedKeys => {
      state.expandedKeys = expandedKeys;
    },
    [state],
  );

  // antd tree data
  const treeData = React.useMemo(() => {
    return treeFn.traverseTreeNodes(node => {
      let totalLen = 0;
      traverseTreeNodes([node], node => {
        totalLen += node.caseIds?.length ?? 0;
      });
      node.length = [node.caseIds?.length ?? 0, totalLen];
    });
  }, [treeFn]);

  const isEmptyFolderTree = React.useMemo(() => {
    return hasArrayItem(treeData) && treeData[0].children?.length === 0;
  }, [treeData]);

  React.useEffect(() => {
    if (treeData?.length && !isInitialRef.current) {
      isInitialRef.current = true;
      const node = treeData[0];
      // 默认展开模块第一层
      handleExpand([node.key]);
      handleSelect([node.key], {
        node,
      });
    }
  }, [handleSelect, treeData, handleExpand]);

  // 空目录展示
  const EmptyNode = React.useMemo(() => {
    if (loading) return null;
    // 存在其他模块

    if (!isEmptyFolderTree) return null;

    return null;
    // return (
    //   <Empty
    //     className={cx('empty')}
    //     description={
    //       <>
    //         <p>模块为空</p>
    //         <p className={cx('hint')}>请先新建模块</p>
    //       </>
    //     }
    //   >
    //     <Button type="primary" size="small" onClick={() => handleMenuClick(MenuKey.createFolder)}>
    //       新建模块
    //     </Button>
    //   </Empty>
    // );
  }, [isEmptyFolderTree, loading]);

  const ToolKitButtons = [
    <Button
      key="创建模块"
      onClick={() => handleMenuClick(MenuKey.createFolder, selectedTreeNode)}
      style={{ height: 24, width: 24 }}
      icon={<CustomPlus />}
      type="text"
    />,
    <Button
      key="折叠全部"
      style={{ height: 24, width: 24 }}
      onClick={() => (state.expandedKeys = [])}
      icon={<CustomScreenOff />}
      type="text"
    />,
    <Dropdown
      key="更多"
      disabled={selectedTreeNode?.key === UNGROUPED_FOLDER_KEY}
      overlay={
        <FolderMenu
          onClick={({ key }) => handleMenuClick(key, selectedTreeNode || {})}
          disabledKeys={folderMenuDisabledKeys}
        />
      }
    >
      <CustomMore className={cx(selectedTreeNode?.key === UNGROUPED_FOLDER_KEY && 'disabled')} />
    </Dropdown>,
  ];

  const handleItemDrop = React.useCallback(
    async ({ testId, toFolderKey, fromFolderKey }) => {
      if (fromFolderKey === toFolderKey) return;
      const currentFolderNode = treeFn.getTreeNodeByKey(state.selectedKeys[0]);
      const updateValues = [testId].map(d => ({
        objectId: d,
        repository: toFolderKey,
      }));

      const res = await updateTestEntity(updateValues);
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }

      notification.success({
        message: '测试用例移动成功',
      });

      const refreshedTreeNodes = await onFolderTreeChange();

      const newCurrentFolderNode = getTreeNodeByKey(refreshedTreeNodes, state.selectedKeys[0]);

      handleSelect([currentFolderNode.key], {
        node: newCurrentFolderNode,
      });
    },
    [treeFn, state.selectedKeys, onFolderTreeChange, handleSelect],
  );

  const titleRender = React.useCallback(
    node => (
      <DropTreeTitle key={node.key} nodeKey={node.key} onItemDrop={handleItemDrop}>
        <>
          <OverflowTooltip title={node.name}>
            <span className={cx('tree-node-name')}>{node.name}</span>
          </OverflowTooltip>

          <span className={cx('tree-node-length')}>{`${node.length[0]}(${node.length[1]})`}</span>
          <Dropdown
            overlay={
              <FolderMenu
                disabledKeys={
                  node.key === 'root'
                    ? [MenuKey.deleteFolder, MenuKey.renameFolder]
                    : node.disabledMenuKeys
                }
                onClick={({ key }) => handleMenuClick(key, node)}
              />
            }
          >
            <CustomMore onClick={e => e.stopPropagation()} className={cx('tree-node-action')} />
          </Dropdown>
        </>
      </DropTreeTitle>
    ),
    [handleMenuClick, handleItemDrop],
  );

  const updateRepository = useCallback(
    async data => {
      await updateFolders(data);
      await onFolderTreeChange();
    },
    [onFolderTreeChange],
  );

  const onDrop = useCallback(
    info => {
      const { node, dragNode } = info;
      const dropKey = node.key;
      const nodeChild = node?.children ?? [];
      const dragKey = dragNode.key;
      const dropPos = node.pos.split('-');
      const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

      let hierarchy = 0;

      const getHierarchy = nodes => {
        nodes.forEach(n => {
          if (n.children?.length) {
            getHierarchy(n.children);
          }
        });

        hierarchy++;
      };

      getHierarchy([dragNode]);

      const validateHierarchy = (index = 0) => {
        const newHierarchy = (dropPos.length - 2 - index || 0) + hierarchy;
        return newHierarchy >= 9;
      };

      if (dropPosition < 0) return;
      if (!info.dropToGap) {
        // 拖拽到子级, 排序到子节点的首位
        if (validateHierarchy(0)) {
          notification.warn({
            message: '限制8个层级，拖拽后超过8个层级，不允许拖拽',
          });
          return;
        }
        const needUpdateDragNode = {
          key: dragKey,
          parentKey: node.key,
          sortIndex: nodeChild?.length ? nodeChild[0]?.sortIndex - 10e5 : dragNode.sortIndex,
        };

        updateRepository([needUpdateDragNode]);
      } else if (
        ((node as any).children || []).length > 0 && // Has children
        dropPosition === 1 // On the bottom gap
      ) {
        // 拖拽目标用例库底部，排序到首位
        if (validateHierarchy(0)) {
          notification.warn({
            message: '限制8个层级，拖拽后超过8个层级，不允许层级',
          });
          return;
        }
        const needUpdateDragNode = {
          key: dragKey,
          parentKey: node.key,
          sortIndex: nodeChild?.[0]?.sortIndex - 10e5,
        };

        updateRepository([needUpdateDragNode]);
      } else {
        // 平级拖拽，排序到目标节点后位，dropKey 为 root 不操作,
        if (dropKey === 'root') return;
        if (validateHierarchy(1)) {
          notification.warn({
            message: '限制8个层级，拖拽后超过8个层级，不允许层级',
          });
          return;
        }
        const needUpdateDragNode = {
          key: dragKey,
          parentKey: node.parentKey,
          ...getSortIndex(getTargetNodesSortIndex(treeData, node.parentKey, dropKey)),
        };
        updateRepository([needUpdateDragNode]);
      }
    },
    [treeData, updateRepository],
  );

  return (
    <div className={cx('folder-tree', className)}>
      <div className={cx('toolkit-bar')}>{ToolKitButtons.map(Button => Button)}</div>

      <DirectoryTree
        treeData={treeData}
        expandAction={false}
        className={cx('tree')}
        onExpand={(keys, { nativeEvent }) => {
          if (['dragenter'].includes(nativeEvent.type)) return;
          handleExpand(keys);
        }}
        onSelect={handleSelect}
        titleRender={titleRender}
        onRightClick={handleRightClick}
        selectedKeys={state.selectedKeys}
        expandedKeys={state.expandedKeys}
        icon={({ expanded }) => (expanded ? <FileOpen /> : <FileClose />)}
        switcherIcon={<CaretDownOutlined style={{ color: '#878C96' }} />}
        draggable
        onDrop={onDrop}
      />
      {EmptyNode}
    </div>
  );
};

export default React.memo(FolderTree);
