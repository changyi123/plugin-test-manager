/* eslint-disable react-hooks/exhaustive-deps */
import { useSDK } from '@projectproxima/plugin-sdk';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useDrop, useReactive } from 'ahooks';
import { Button, Dropdown, Input, message, Modal, notification, Tree } from 'antd';
import { sum, uniq } from 'lodash';
import React, { useCallback } from 'react';

import {
  CaretDownOutlined,
  CustomMore,
  CustomPlus,
  CustomScreenOff,
  FileClose,
  FileOpen,
} from '@/icons';
import { updateTestEntity } from '@/lib/api/item';
import { createFolder, deleteFolder, updateFolders } from '@/lib/api/repository';
import { TestType } from '@/lib/constants';
import { repositoryFolderTreeEvent } from '@/lib/events';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import {
  getProximaBasePath,
  getRootContainer,
  getTenantKey,
  hasArrayItem,
  inIframe,
} from '@/lib/utils/helper';

import { UNGROUPED_FOLDER_KEY } from '../constant';
import { useTreeFn } from '../hook';
import { FolderMenu, MenuKey } from '../Menu';
import { traverseTreeNodes, traverseTreeNodesAndAddTitle } from '../util';
import { getTreeNodeByKey } from '../util';
import cx from './index.less';

const proxima = createProximaSdk();

const { DirectoryTree } = Tree;

type OpenFolderNameModal = (args: {
  name?: string;
  title: string;
  t?: (val: string) => string;
  validator?: (name) => void;
}) => Promise<string>;

const openFolderNameModal: OpenFolderNameModal = ({ title, name, validator, t }) => {
  let inputRef = null;
  const inputProps = {
    ref: ele => (inputRef = ele),
    defaultValue: name,
    placeholder: t('page.repository.folderTree.placeholder'),
    maxLength: 100,
  };
  const input = <Input {...inputProps} />;
  return new Promise((resolve, reject) => {
    Modal.confirm({
      title,
      icon: null,
      content: input,
      className: cx('title-editor'),
      getContainer: getRootContainer,
      async onOk() {
        const inputValue = inputRef.input.value?.trim() ?? '';
        validator?.(inputValue);
        resolve(inputValue);
      },
      onCancel() {
        reject();
      },
      cancelText: t('common.cancel'),
      okText: t('common.confirm'),
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
  caseIds?: string[];
  children: TreeNode[];
  counts: number[];
};

type FolderTreeProps = {
  loading?: boolean;
  className?: string;
  treeNodeData: TreeNode[];
  onSelect(node: TreeNode): void;
  onFolderTreeChange?: () => Promise<any>;
};

const FolderTree: React.FC<FolderTreeProps> = ({
  onSelect,
  loading,
  className,
  treeNodeData,
  onFolderTreeChange,
}) => {
  const { t } = useI18n();
  const state = useReactive({
    expandedKeys: [],
    selectedKeys: ['root'],
  });
  const treeFn = useTreeFn(traverseTreeNodesAndAddTitle(treeNodeData));

  const isInitialRef = React.useRef(false);
  const {
    workspace,
    config: { itemTypeMap },
  } = useTestConfig();

  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const { context } = useSDK();

  const checkCaseForDeleteRepository = context?.env?.CHECK_CASE_FOR_DELETE_REPOSITORY;

  const selectedTreeNode = React.useMemo(() => {
    return treeFn.getTreeNodeByKey(state.selectedKeys[0]);
  }, [treeFn, state.selectedKeys]);

  // 获取节点数据
  const treeData = React.useMemo(() => {
    return treeFn.traverseTreeNodes();
  }, [treeFn]);

  const folderMenuDisabledKeys = React.useMemo(() => {
    const keys = [];
    if (!itemTypeMap?.TestCase) {
      keys.push(MenuKey.createTest);
    }
    if (getCreatePermission(TestType.Case)) {
      keys.push(MenuKey.createTest);
    }
    return keys;
  }, [getCreatePermission, itemTypeMap?.TestCase]);

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
        message: t('page.repository.folderTree.inputNameValidatorMessage.0'),
      });
      throw new Error('can not set same name');
    }
    if (!inputName) {
      notification.error({
        message: t('page.repository.folderTree.inputNameValidatorMessage.1'),
      });
      throw new Error('required name');
    }
    if (inputName.length > 100) {
      notification.error({
        message: t('page.repository.folderTree.inputNameValidatorMessage.2'),
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
          notification.warning({
            message: t('page.repository.folderTree.hierarchyTips'),
          });
          return;
        }
        const folderName = await openFolderNameModal({
          title: t('page.repository.folderTree.createChildFolder'),
          t,
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
        repositoryFolderTreeEvent.dispatch();
        notification.success({
          message: t('page.repository.folderTree.createChildFolderSuccess'),
        });
      } else if (actionKey === MenuKey.renameFolder) {
        const newFolderName = await openFolderNameModal({
          title: t('page.repository.folderTree.renameFolder'),
          name: node.name,
          t,
          // 获取当前节点的所有 sibling 节点，重命名校验过滤当前节点
          validator: inputName =>
            inputNameValidator(
              inputName,
              (treeFn.getTreeNodeByKey(node.parentKey)?.children ?? []).filter(
                d => d.key !== node.key,
              ),
            ),
        });
        // 未修改用例库名称不处理
        if (newFolderName === node.name) return;
        await updateFolders([
          {
            key: node.key,
            name: newFolderName,
          },
        ]);
        repositoryFolderTreeEvent.dispatch();
        notification.success({
          message: `${t('page.repository.folderTree.renameFolderSuccess')}【${newFolderName}】`,
        });
      } else if (actionKey === MenuKey.deleteFolder) {
        Modal.confirm({
          className: `${cx('confirm')} global-ant-modal`,
          getContainer: getRootContainer,
          title: t('page.repository.folderTree.deleteFolder'),
          width: 500,
          content: (
            <>
              <div>
                {t('page.repository.folderTree.deleteFolderTips.0')}【{node.name}】
                {t('page.repository.folderTree.deleteFolderTips.1')}？
              </div>
              <div>
                {checkCaseForDeleteRepository
                  ? t(
                      'page.repository.folderTree.checkCaseDeleteFolderTips.confirmDeleteRepositoryTip',
                    )
                  : t('page.repository.folderTree.deleteFolderTips.2')}{' '}
              </div>
            </>
          ),
          cancelText: t('common.cancel'),
          okText: t('common.confirm'),
          okButtonProps: {
            type: 'default',
            danger: true,
          },
          onOk: async () => {
            if (checkCaseForDeleteRepository) {
              const hasCase = node.counts?.some(count => count > 0);
              if (hasCase) {
                return message.error(
                  t('page.repository.folderTree.checkCaseDeleteFolderTips.cannotDeleteRepository', {
                    name: node.name,
                  }),
                );
              }
            }

            const keys = [];
            traverseTreeNodes([node], node => {
              keys.push(node.key);
            });
            await deleteFolder(keys);
            notification.success({
              message: t('page.repository.folderTree.deleteFolderSuccess'),
            });
            const refreshedTreeData = await onFolderTreeChange();
            repositoryFolderTreeEvent.dispatch();
            const parentNode = getTreeNodeByKey(refreshedTreeData, node.parentKey);
            if (parentNode) {
              // 删除后选中模块置于被删除模块的父级
              handleSelect([node.parentKey], {
                node: parentNode,
              });
            } else {
              // 当前模块无父级需要冲选择根目录
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
        // node.caseIds = (node.caseIds || []).concat(testEntityList.map(d => d.objectId));
        await updateFolders([node]);
        const successMessage =
          testEntityList.length > 1
            ? `${testEntityList.length}${t('page.repository.folderTree.caseCreateSuccessTips.0')}`
            : `${t('page.repository.folderTree.caseCreateSuccessTips.1')}【${
                testEntityList[0]?.name
              }】${t('page.repository.folderTree.caseCreateSuccessTips.2')}`;
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
        }?app=test_manager&disableToggleWorkspace=true&hiddenItemType=true${appendedQueryString}&group=${
          node.key
        }`;
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
  }, [isEmptyFolderTree, loading]);

  const ToolKitButtons = [
    <Button
      key={t('page.repository.folderTree.buttonName.0')}
      onClick={() => handleMenuClick(MenuKey.createFolder, selectedTreeNode)}
      style={{ height: 24, width: 24 }}
      icon={<CustomPlus />}
      type="text"
    />,
    <Button
      key={t('page.repository.folderTree.buttonName.1')}
      style={{ height: 24, width: 24 }}
      onClick={() => (state.expandedKeys = [])}
      icon={<CustomScreenOff />}
      type="text"
    />,
    <Dropdown
      key={t('page.repository.folderTree.buttonName.2')}
      disabled={selectedTreeNode?.key === UNGROUPED_FOLDER_KEY}
      dropdownRender={() => (
        <FolderMenu
          onClick={({ key }) => handleMenuClick(key, selectedTreeNode || {})}
          disabledKeys={folderMenuDisabledKeys}
        />
      )}
    >
      <CustomMore className={cx(selectedTreeNode?.key === UNGROUPED_FOLDER_KEY && 'disabled')} />
    </Dropdown>,
  ];

  const handleItemDrop = React.useCallback(
    async ({ testId, toFolderKey, fromFolderKey }) => {
      if (fromFolderKey === toFolderKey) return;
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
        message: t('page.repository.folderTree.dropCaseTips.0'),
      });

      await onFolderTreeChange();
      repositoryFolderTreeEvent.dispatch();
      proxima.execute('updateItemList');
    },
    [onFolderTreeChange, repositoryFolderTreeEvent],
  );

  const titleRender = React.useCallback(
    node => {
      const getDisabledKeys = (keys = []) => {
        keys =
          node.key === 'root'
            ? [MenuKey.deleteFolder, MenuKey.renameFolder]
            : node.disabledMenuKeys ?? [];
        if (getCreatePermission(TestType.Case)) {
          keys = keys.concat(MenuKey.createTest);
        }

        return keys;
      };

      return (
        <DropTreeTitle key={node.key} nodeKey={node.key} onItemDrop={handleItemDrop}>
          <>
            <span className="ellipsis" title={node.name}>
              {node.name}
            </span>
            <span className={cx('tree-node-length')}>
              {`${node?.counts ? `${node?.counts?.[0]}(${node?.counts?.[1]})` : ''}`}
            </span>
            <Dropdown
              dropdownRender={() => (
                <FolderMenu
                  disabledKeys={getDisabledKeys()}
                  onClick={({ key }) => handleMenuClick(key, node)}
                />
              )}
            >
              <CustomMore
                title=""
                alt=""
                onClick={e => e.stopPropagation()}
                className={cx('tree-node-action')}
              />
            </Dropdown>
          </>
        </DropTreeTitle>
      );
    },
    [handleMenuClick, handleItemDrop, getCreatePermission],
  );

  const updateRepository = useCallback(
    async data => {
      await updateFolders(data);
      await onFolderTreeChange();
    },
    [onFolderTreeChange],
  );

  const onDrop = useCallback(
    async info => {
      const { node, dragNode } = info;
      const dropKey = node.key;
      const nodeChild = node?.children ?? [];
      const dragKey = dragNode.key;
      const dropPos = node.pos.split('-');
      const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

      let hierarchy = 1;

      const getHierarchy = nodes => {
        const children = nodes.map(d => d.children ?? []).flat();
        if (!children?.length) return;
        hierarchy++;
        getHierarchy(children);
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
          notification.warning({
            message: t('page.repository.folderTree.dropCaseTips.1'),
          });
          return;
        }
        const needUpdateDragNode = {
          key: dragKey,
          parentKey: node.key,
          sortIndex: nodeChild?.length ? nodeChild[0]?.sortIndex - 10e5 : dragNode.sortIndex,
        };

        await updateRepository([needUpdateDragNode]);
      } else if (
        ((node as any).children || []).length > 0 && // Has children
        dropPosition === 1 // On the bottom gap
      ) {
        // 拖拽目标用例库底部，排序到底部
        if (validateHierarchy(0)) {
          notification.warning({
            message: t('page.repository.folderTree.dropCaseTips.1'),
          });
          return;
        }
        const num = nodeChild?.length;
        const needUpdateDragNode = {
          key: dragKey,
          parentKey: node.key,
          sortIndex: nodeChild?.[num]?.sortIndex + 10e5,
        };

        await updateRepository([needUpdateDragNode]);
      } else {
        // 平级拖拽，排序到目标节点后位，dropKey 为 root 不操作,
        if (dropKey === 'root') return;
        if (validateHierarchy(1)) {
          notification.warning({
            message: t('page.repository.folderTree.dropCaseTips.1'),
          });
          return;
        }
        const needUpdateDragNode = {
          key: dragKey,
          parentKey: node.parentKey,
          ...getSortIndex(getTargetNodesSortIndex(treeData, node.parentKey, dropKey)),
        };
        await updateRepository([needUpdateDragNode]);
      }
      await repositoryFolderTreeEvent.dispatch();
      await proxima.execute('updateItemList', { type: 'delete' });
    },
    [treeData, updateRepository, onFolderTreeChange],
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
