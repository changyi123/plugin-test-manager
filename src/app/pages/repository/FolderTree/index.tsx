/* eslint-disable react-hooks/exhaustive-deps */
import { useSDK } from '@giteeteam/plugin-sdk';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useDebounceFn, useDrop } from 'ahooks';
import { Button, Dropdown, Input, message, Modal, notification } from 'antd';
import { sum, uniq } from 'lodash';
import React, { useCallback, useState } from 'react';

import { copyFolderWithProcess } from '@/components/business/BatchResult/hooks';
import {
  CustomMore,
  CustomPlus,
  CustomScreenOff,
} from '@/icons';
import { updateTestEntity } from '@/lib/api/item';
import { createFolder, deleteFolder, updateFolders } from '@/lib/api/repository';
import { getAppEnv } from '@/lib/appEnv';
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
import { getTreeDepthBFS, traverseTreeNodes, traverseTreeNodesAndAddTitle } from '../util';
import { getTreeNodeByKey } from '../util';
import cx from './index.less';
import ChangeFolderModal, { CHANGE_TYPE } from './Modal/ChangeFolder';
import VirtualTree from './VirtualTree';

const proxima = createProximaSdk();

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
  disabledMenuKeys?: string[];
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
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [expandedKeys, setExpandedKeys] = React.useState([]);
  const [selectedKeys, setSelectedKeys] = React.useState(['root']);
  const treeFn = useTreeFn(traverseTreeNodesAndAddTitle(treeNodeData));

  // 树容器的ref，用于计算自适应高度
  const treeContainerRef = React.useRef<HTMLDivElement>(null);
  const [treeHeight, setTreeHeight] = React.useState(600); // 默认高度

  const isInitialRef = React.useRef(false);
  const changeFolderModalRef = React.useRef(null);
  const {
    workspace,
    config: { itemTypeMap },
  } = useTestConfig();

  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const { context } = useSDK();

  const checkCaseForDeleteRepository = context?.env?.CHECK_CASE_FOR_DELETE_REPOSITORY;

  const selectedTreeNode = React.useMemo(() => {
    return treeFn.getTreeNodeByKey(selectedKeys[0]);
  }, [treeFn, selectedKeys]);

  // 搜索处理函数 - 只处理展开逻辑
  const { run: handleSearchDebounced } = useDebounceFn(
    (value: string) => {
      setIsSearching(!!value);

      if (value) {
        // 展开所有包含搜索内容的节点
        const expandKeys: string[] = [];
        const searchNodes = (nodes: TreeNode[]) => {
          nodes.forEach(node => {
            if (node.name?.toLowerCase().includes(value.toLowerCase())) {
              // 添加所有父节点到展开列表
              let currentNode = node;
              while (currentNode.parentKey) {
                expandKeys.push(currentNode.parentKey);
                currentNode = treeFn.getTreeNodeByKey(currentNode.parentKey);
              }
              expandKeys.push(node.key);
            }
            if (node.children?.length) {
              searchNodes(node.children);
            }
          });
        };
        searchNodes(treeNodeData);
        setExpandedKeys(uniq(expandKeys));
      } else {
        // 清空搜索时，恢复默认展开状态
        if (treeNodeData?.length) {
          const node = treeNodeData[0];
          setExpandedKeys([node.key]);
        }
      }
    },
    { wait: 300 },
  );

  // 输入框值改变处理 - 立即更新值，延迟执行搜索
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      handleSearchDebounced(value);

      // 如果值为空（清除操作），立即处理
      if (!value) {
        setIsSearching(false);
        // 恢复默认展开状态
        if (treeNodeData?.length) {
          const node = treeNodeData[0];
          setExpandedKeys([node.key]);
        }
      }
    },
    [handleSearchDebounced, treeNodeData],
  );

  // 高亮搜索文本
  const highlightText = useCallback(
    (text: string) => {
      if (!searchValue) return text;

      const index = text.toLowerCase().indexOf(searchValue.toLowerCase());
      if (index === -1) return text;

      const beforeStr = text.substring(0, index);
      const matchStr = text.substring(index, index + searchValue.length);
      const afterStr = text.substring(index + searchValue.length);

      return (
        <span>
          {beforeStr}
          <span style={{ color: '#1890ff', backgroundColor: '#e6f7ff' }}>{matchStr}</span>
          {afterStr}
        </span>
      );
    },
    [searchValue],
  );

  // 检查节点或其子节点是否匹配搜索条件
  const hasMatchInSubtree = useCallback(
    (node: TreeNode): boolean => {
      if (!searchValue) return true;

      // 如果当前节点匹配搜索词，显示
      if (node.name?.toLowerCase().includes(searchValue.toLowerCase())) {
        return true;
      }

      // 如果当前节点不匹配，检查子节点是否有匹配的
      if (node.children?.length) {
        return node.children.some(child => hasMatchInSubtree(child));
      }

      return false;
    },
    [searchValue],
  );

  // 过滤树数据 - 保持树结构但隐藏不匹配的节点
  const filterTreeData = useCallback(
    (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map(node => {
          // 递归过滤子节点
          const filteredChildren = node.children?.length ? filterTreeData(node.children) : [];

          // 判断是否应该显示该节点（节点本身匹配或有子节点匹配）
          const shouldShow = hasMatchInSubtree(node);

          if (!shouldShow) {
            // 如果节点不应该显示且没有需要显示的子节点，则隐藏
            return null;
          }

          // 返回过滤后的节点
          return {
            ...node,
            children: filteredChildren,
          };
        })
        .filter(Boolean) as TreeNode[];
    },
    [hasMatchInSubtree],
  );

  // 获取节点数据
  const treeData = React.useMemo(() => {
    const baseTreeData = treeFn.traverseTreeNodes();

    // 如果有搜索值，应用过滤
    if (searchValue) {
      return filterTreeData(baseTreeData);
    }

    return baseTreeData;
  }, [treeFn, treeNodeData, searchValue, filterTreeData]);

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
        setExpandedKeys(prev => uniq(prev.concat(keys)));
      }
    },
    [setExpandedKeys, treeFn],
  );

  const handleSelect = React.useCallback(
    (selectedKeys, { node }) => {
      setSelectedKeys(selectedKeys);
      onSelect(node);
    },
    [onSelect, setSelectedKeys],
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

  const getReverseDepth = useCallback(
    node => {
      let hierarchy = 0;
      treeFn.reverseTreeNodes(node, () => {
        hierarchy++;
      });
      return hierarchy;
    },
    [treeFn],
  );

  const validateDepth = useCallback(
    (node, targetNode) => {
      const currentDepth = Math.max(getTreeDepthBFS(node) - 1, 0);
      const targetDepth = Math.max(getReverseDepth(targetNode) - 1, 0);
      // 模块创建限制 8 个层级
      // 全部用例不算一个层级
      if ((currentDepth || 0) + targetDepth >= 9) {
        notification.warning({
          message: t('page.repository.folderTree.hierarchyTips'),
        });
        return;
      }
      return true;
    },
    [t, getReverseDepth, getTreeDepthBFS],
  );

  const changeFolderValidate = useCallback(
    (name, nodes, node, targetNode) => {
      if (!validateDepth(node, targetNode)) {
        throw new Error(t('page.repository.folderTree.createChildFolder'));
      }
      inputNameValidator(name, nodes);
    },
    [validateDepth, inputNameValidator, t],
  );

  /** 右键菜单处理函数 */
  const handleMenuClick = React.useCallback(
    async (actionKey: MenuKey, node?: TreeNode) => {
      if (actionKey === MenuKey.createFolder) {
        if (getReverseDepth(node) >= 9) {
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
        node?.key && setExpandedKeys(prev => [...prev, node.key]);
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
      } else if (actionKey === MenuKey.moveFolder) {
        const moveParams = await changeFolderModalRef.current.open(CHANGE_TYPE.MOVE, node);
        await updateFolders([
          {
            key: node.key,
            name: moveParams.name,
            parentKey: moveParams.parentKey || UNGROUPED_FOLDER_KEY,
          },
        ]);
        await onFolderTreeChange();
        repositoryFolderTreeEvent.dispatch();
        notification.success({
          message: t('page.repository.folderTree.moveFolderSuccess'),
        });
      } else if (actionKey === MenuKey.copyFolder) {
        const nodeParams = await changeFolderModalRef.current.open(CHANGE_TYPE.COPY, node);
        await copyFolderWithProcess({
          node: {
            ...node,
            ...nodeParams,
          },
          itemTypeKey: itemTypeMap[TestType.Case],
          workspace: workspace,
          handleSuccess: async () => {
            await onFolderTreeChange();
            repositoryFolderTreeEvent.dispatch();
            notification.success({
              message: t('page.repository.folderTree.copyFolderSuccess'),
            });
          },
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
                message.error(
                  t('page.repository.folderTree.checkCaseDeleteFolderTips.cannotDeleteRepository', {
                    name: node.name,
                  }),
                );
                return Promise.resolve();
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
        const isEnableImportSnapShotConfig = getAppEnv('ENABLE_IMPORT_SNAP_SHOT_CONFIG');

        const showSnapShotConfigString = isEnableImportSnapShotConfig
          ? '&showSnapShotConfig=true'
          : '';
        const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
        // 跳转到导入页面
        const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspace.key}/import/${
          workspace.objectId
        }?app=test_manager&disableToggleWorkspace=true&hiddenItemType=true${appendedQueryString}&group=${
          node.key
        }&validateRequired=${getAppEnv('GROUP_REQUIRED_WHEN_VALIDATE')}${showSnapShotConfigString}`;
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
      expandedKeys,
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

  const handleExpand = React.useCallback(expandedKeys => {
    // 防抖处理，避免频繁更新
    requestAnimationFrame(() => {
      setExpandedKeys(expandedKeys);
    });
  }, []);

  const isEmptyFolderTree = React.useMemo(() => {
    return hasArrayItem(treeData) && treeData[0].children?.length === 0;
  }, [treeData]);

  // 计算树的自适应高度
  React.useEffect(() => {
    const calculateHeight = () => {
      if (treeContainerRef.current) {
        const container = treeContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const toolkitBar = container.querySelector('.toolkit-bar') as HTMLElement;
        const toolkitHeight = toolkitBar?.offsetHeight || 46;

        // 可用高度 = 容器高度 - 工具栏高度 - 小间距
        const availableHeight = containerRect.height - toolkitHeight - 10;
        setTreeHeight(Math.max(300, availableHeight)); // 最小300px
      }
    };

    // 初始计算
    calculateHeight();

    // 使用ResizeObserver监听容器大小变化
    let resizeObserver: ResizeObserver | null = null;

    if (treeContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(calculateHeight);
      });
      resizeObserver.observe(treeContainerRef.current);
    }

    // 备用方案：监听窗口大小变化
    const handleResize = () => {
      requestAnimationFrame(calculateHeight);
    };

    window.addEventListener('resize', handleResize);

    // 延迟再次计算，确保DOM完全渲染
    const timer = setTimeout(calculateHeight, 100);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  React.useEffect(() => {
    if (treeData?.length && !isInitialRef.current) {
      isInitialRef.current = true;
      const node = treeData[0];
      // 批量更新，避免多次重渲染
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
      onClick={() => setExpandedKeys([])}
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

  // 优化titleRender - 使用稳定的回调和缓存
  const getDisabledKeysCache = React.useRef(new Map());

  const getDisabledKeys = React.useCallback(
    (node: TreeNode) => {
      const cacheKey = `${node.key}-${getCreatePermission(TestType.Case)}`;
      if (getDisabledKeysCache.current.has(cacheKey)) {
        return getDisabledKeysCache.current.get(cacheKey);
      }

      let keys =
        node.key === 'root'
          ? [MenuKey.deleteFolder, MenuKey.renameFolder, MenuKey.copyFolder, MenuKey.moveFolder]
          : node.disabledMenuKeys ?? [];

      if (getCreatePermission(TestType.Case)) {
        keys = keys.concat(MenuKey.createTest);
      }

      getDisabledKeysCache.current.set(cacheKey, keys);
      return keys;
    },
    [getCreatePermission],
  );

  // 预生成稳定的回调，减少titleRender内的函数创建
  const handleMenuClickStable = React.useCallback(
    (key, node) => {
      handleMenuClick(key, node);
    },
    [handleMenuClick],
  );

  const titleRender = React.useCallback(
    node => {
      const disabledKeys = getDisabledKeys(node);
      const countsText = node?.counts ? `${node.counts[0]}(${node.counts[1]})` : '';

      return (
        <DropTreeTitle key={node.key} nodeKey={node.key} onItemDrop={handleItemDrop}>
          <>
            <span className="ellipsis" title={node.name}>
              {highlightText(node.name)}
            </span>
            <span className={cx('tree-node-length')}>{countsText}</span>
            <Dropdown
              dropdownRender={() => (
                <FolderMenu
                  disabledKeys={disabledKeys}
                  onClick={({ key }) => handleMenuClickStable(key, node)}
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
    [handleItemDrop, getDisabledKeys, handleMenuClickStable],
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
      const { node, dragNode, dropPosition } = info;

      console.log('📋 FolderTree onDrop 收到数据:', {
        dragNodeName: dragNode.name,
        dragNodeKey: dragNode.key,
        dragNodePos: dragNode.pos,
        targetNodeName: node.name,
        targetNodeKey: node.key,
        targetNodePos: node.pos,
        targetParentKey: node.parentKey,
        targetSortIndex: node.sortIndex,
        dropPosition,
        dropToGap: info.dropToGap,
      });

      // 防止拖拽到自己或根节点
      if (dragNode.key === node.key || node.key === 'root') {
        return;
      }

      const dragKey = dragNode.key;

      // 对于同级拖拽，应该检查 dropToGap 参数
      // 如果 dropToGap 为 true，说明是同级插入，不需要层级检查
      if (!info.dropToGap) {
        // 只有在拖拽到节点内部时才需要层级检查
        const targetPos = node.pos ? node.pos.split('-') : [];
        const targetLevel = targetPos.length - 1;

        // 检查被拖拽节点的最大子层级深度
        const getMaxChildDepth = (nodes: any[], currentDepth = 0): number => {
          let maxDepth = currentDepth;
          nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
              const childDepth = getMaxChildDepth(node.children, currentDepth + 1);
              maxDepth = Math.max(maxDepth, childDepth);
            }
          });
          return maxDepth;
        };
        const maxChildDepth = getMaxChildDepth([dragNode]);

        // 拖入节点内部的最终层级 = 目标层级 + 1 + 被拖拽节点的子层级深度
        const finalHierarchy = targetLevel + 1 + maxChildDepth;

        // 层级限制检查（最多8层，从0开始计算，所以限制是7）
        if (finalHierarchy >= 8) {
          notification.warning({
            message: t('page.repository.folderTree.hierarchyTips'),
          });
          return;
        }
      }

      // 区分同级插入和子节点插入
      let needUpdateDragNode: { key: string; parentKey: string | null; sortIndex: number };

      if (info.dropToGap) {
        // 同级插入逻辑
        const parentNode = treeFn.getTreeNodeByKey(node.parentKey);
        const siblings = parentNode?.children || treeData; // 如果是根节点，使用treeData
        const sortedSiblings = siblings.sort(
          (a: any, b: any) => (a.sortIndex || 0) - (b.sortIndex || 0),
        );
        const targetIndex = sortedSiblings.findIndex((sibling: any) => sibling.key === node.key);

        console.log('📊 同级插入位置计算:', {
          dropPosition,
          targetNodeName: node.name,
          targetSortIndex: node.sortIndex,
          targetParentKey: node.parentKey,
          targetIndex,
          siblingsCount: sortedSiblings.length,
        });

        let newSortIndex: number;

        if (dropPosition === 0) {
          // 插入到目标节点前面
          if (targetIndex === 0) {
            // 插入到第一个位置
            newSortIndex = (node.sortIndex || 0) - 1000000;
          } else {
            // 插入到中间位置，取前一个和当前的中间值
            const prevSortIndex = sortedSiblings[targetIndex - 1]?.sortIndex || 0;
            const currentSortIndex = node.sortIndex || 0;
            newSortIndex = Math.floor((prevSortIndex + currentSortIndex) / 2);

            // 如果中间值相同，则向前偏移
            if (newSortIndex === currentSortIndex || newSortIndex === prevSortIndex) {
              newSortIndex = prevSortIndex - 1000000;
            }
          }

          needUpdateDragNode = {
            key: dragKey,
            parentKey: node.parentKey,
            sortIndex: newSortIndex,
          };

          console.log('🔼 插入到前面:', {
            targetIndex,
            originalSortIndex: node.sortIndex,
            newSortIndex,
          });
        } else {
          // 插入到目标节点后面
          if (targetIndex === sortedSiblings.length - 1) {
            // 插入到最后一个位置
            newSortIndex = (node.sortIndex || 0) + 1000000;
          } else {
            // 插入到中间位置，取当前和后一个的中间值
            const currentSortIndex = node.sortIndex || 0;
            const nextSortIndex =
              sortedSiblings[targetIndex + 1]?.sortIndex || currentSortIndex + 2000000;
            newSortIndex = Math.floor((currentSortIndex + nextSortIndex) / 2);

            // 如果中间值相同，则向后偏移
            if (newSortIndex === currentSortIndex || newSortIndex === nextSortIndex) {
              newSortIndex = nextSortIndex + 1000000;
            }
          }

          needUpdateDragNode = {
            key: dragKey,
            parentKey: node.parentKey,
            sortIndex: newSortIndex,
          };

          console.log('🔽 插入到后面:', {
            targetIndex,
            originalSortIndex: node.sortIndex,
            newSortIndex,
          });
        }
      } else {
        // 子节点插入逻辑
        console.log('📦 子节点插入逻辑:', {
          dragNodeName: dragNode.name,
          targetNodeName: node.name,
          targetNodeKey: node.key,
        });

        // 插入为目标节点的第一个子节点
        const targetChildren = node.children || [];
        let newSortIndex: number;

        if (targetChildren.length === 0) {
          // 目标节点没有子节点，使用基础sortIndex
          newSortIndex = 1000000000; // 10亿作为基础值
        } else {
          // 目标节点有子节点，插入到第一个位置
          const sortedChildren = targetChildren.sort(
            (a: any, b: any) => (a.sortIndex || 0) - (b.sortIndex || 0),
          );
          const firstChildSortIndex = sortedChildren[0]?.sortIndex || 1000000000;
          newSortIndex = firstChildSortIndex - 1000000;
        }

        needUpdateDragNode = {
          key: dragKey,
          parentKey: node.key, // 父节点是目标节点
          sortIndex: newSortIndex,
        };

        console.log('📁 作为子节点插入:', {
          newParentKey: node.key,
          newParentName: node.name,
          newSortIndex,
          targetChildrenCount: targetChildren.length,
        });
      }

      console.log('💾 最终数据库更新参数:', needUpdateDragNode);
      await updateRepository([needUpdateDragNode]);
      repositoryFolderTreeEvent.dispatch();
      proxima.execute('updateItemList', { type: 'delete' });
    },
    [treeData, updateRepository, t],
  );

  return (
    <div ref={treeContainerRef} className={cx('folder-tree', className)}>
      <ChangeFolderModal ref={changeFolderModalRef} validate={changeFolderValidate} />
      <div className={cx('search-box')} style={{ padding: '8px 12px' }}>
        <Input.Search
          placeholder={t('common.search') || '搜索'}
          value={searchValue}
          onChange={handleSearchChange}
          onSearch={value => handleSearchDebounced(value)}
          allowClear
        />
      </div>
      <div className={cx('toolkit-bar')}>{ToolKitButtons.map(Button => Button)}</div>

      <VirtualTree
        treeData={treeData}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        onSelect={(keys, info) => handleSelect(keys, info)}
        onExpand={handleExpand}
        onRightClick={handleRightClick}
        onDrop={onDrop}
        onExternalDrop={({ data, targetNode }) => {
          // 处理从右侧表格拖入的用例
          if (data && targetNode) {
            handleItemDrop({
              testId: data.testId,
              fromFolderKey: data.folderKey,
              toFolderKey: targetNode.key,
            });
          }
        }}
        titleRender={titleRender}
        height={treeHeight}
        itemHeight={32}
        className={cx('tree')}
        draggable
      />
      {EmptyNode}
    </div>
  );
};

export default React.memo(FolderTree, (prevProps, nextProps) => {
  // 精确的props比较，避免不必要的重渲染
  return (
    prevProps.treeNodeData === nextProps.treeNodeData &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.loading === nextProps.loading &&
    prevProps.className === nextProps.className &&
    prevProps.onFolderTreeChange === nextProps.onFolderTreeChange
  );
});
