import { useControllableValue, useMemoizedFn, useRequest } from 'ahooks';
import { Input, Select, Tree } from 'antd';
import { SelectProps } from 'antd/lib/select';
import { cloneDeep } from 'lodash';
import React, { useImperativeHandle, useMemo } from 'react';

import OverflowTooltip from '@/components/common/OverflowTooltip';
import { CaretDownOutlined, FileClose, FileOpen, SearchOutlined } from '@/icons';
import { getWorkspaceById } from '@/lib/api/proxima';
import { getFolderTree } from '@/lib/api/repository';
import useI18n from '@/lib/hooks/useI18n';
import { escapeMatchesQueryArg, hasArrayItem } from '@/lib/utils/helper';
import { getTreeNodeByKey, reverseTreeNodes, traverseTreeNodes } from '@/pages/repository/util';

import cx from './style.less';

type RepositorySelectorInputProps = {
  actionRef?: React.ForwardedRef<any>;
  hiddenKey?: boolean;
  workspaceId?: string;
  workspaceKey?: string;
} & SelectProps;

export const RepositorySelectorField: React.FC<RepositorySelectorInputProps> = props => {
  const { t } = useI18n();
  const {
    workspaceId,
    workspaceKey: workspaceKeyProp,
    value,
    hiddenKey,
    onChange,
    actionRef,
    ...restSelectProps
  } = props;
  const [selectedValue, setSelectedValue] = useControllableValue(
    {
      onChange,
      value,
    },
    {
      valuePropName: 'value',
      trigger: 'onChange',
    },
  );

  const [selectOpenProp, setSelectOpenProp] = React.useState(false);
  const [treeSelectedKeys, setTreeSelectedKeys] = React.useState([]);
  const [treeExpandedKeys, setTreeExpandedKeys] = React.useState([]);
  const [treeAutoExpandParent, setTreeAutoExpandParent] = React.useState(true);
  // 搜索值
  const [searchText, setSearchText] = React.useState('');
  // 匹配的目录名
  const [matchedFolderText, setMatchedFolderText] = React.useState({});
  // 获取 workspaceKey
  const { data: workspaceKey = workspaceKeyProp } = useRequest(
    async () => {
      const workspace = await getWorkspaceById(workspaceId);
      return workspace.key;
    },
    {
      ready: Boolean(workspaceId),
      refreshDeps: [workspaceId],
    },
  );

  const prevWorkspaceKeyRef = React.useRef(null);
  // 获取目录数据
  const { data: folderTreeData, loading: queryLoading } = useRequest(
    async () => {
      if (prevWorkspaceKeyRef.current && prevWorkspaceKeyRef.current !== workspaceKey) {
        // 重置为初始化状态
        prevWorkspaceKeyRef.current = workspaceKey;
        setTreeSelectedKeys([]);
        setSelectedValue([]);
        setMatchedFolderText({});
        setSearchText('');
      }

      const folderTreeData = await getFolderTree(workspaceKey);

      return folderTreeData;
    },
    {
      refreshDeps: [workspaceKey],
    },
  );

  const hiddenSelfAndChildrenKeys = useMemo(() => {
    const flattenedTreeData = (folderTreeData as any)?.flattenedTreeData || [];
    const keys = new Set();
    const getSelfAndChildrenKeys = node => {
      if (node.key) {
        keys.add(node.key);
        if (node.children?.length) {
          node.children.forEach(getSelfAndChildrenKeys);
        }
      }
    };
    const node = flattenedTreeData.find(n => n.key === hiddenKey);
    if (node) getSelfAndChildrenKeys(node);
    return keys;
  }, [folderTreeData, hiddenKey]);

  // 获取目录树数据
  const { data: treeData, loading: handleLoading } = useRequest(
    async () => {
      // 重置为初始态
      setMatchedFolderText({});

      const text = searchText?.trim();
      const needExpandedKeys = [];
      const matchedText = {};
      const clonedFolderTreeData = cloneDeep(folderTreeData);
      const flattenedTreeData = (folderTreeData as any)?.flattenedTreeData || [];

      if (text) {
        const matchRegExp = escapeMatchesQueryArg(text, ['i', 'g']);
        traverseTreeNodes(clonedFolderTreeData, node => {
          const matched = node.name?.match(matchRegExp);
          if (matched) {
            matchedText[node.key] = matched[0];
            needExpandedKeys.push(node.key);
          }
        });
        setMatchedFolderText(matchedText);
      } else {
        // 无输入项，重置选中元素的父级
        const selectedNode = getTreeNodeByKey(clonedFolderTreeData, treeSelectedKeys[0]);
        reverseTreeNodes(clonedFolderTreeData, selectedNode, node => {
          needExpandedKeys.push(node.key);
        });
      }

      setTreeAutoExpandParent(true);
      setTreeExpandedKeys(needExpandedKeys);

      let displayFolderKeySet = new Set(flattenedTreeData.map(n => n.key));
      const filterHiddenNodes = nodes => {
        const filteredNodes = nodes.filter(
          node => displayFolderKeySet.has(node.key) && !hiddenSelfAndChildrenKeys.has(node.key),
        );
        filteredNodes.forEach(node => {
          if (hasArrayItem(node.children)) {
            node.children = filterHiddenNodes(node.children);
          }
        });
        return filteredNodes;
      };

      if (text) {
        // 标记节点的显示隐藏状态
        const getDisplayFolderKey = (nodes, parentKeys = [], result = []) => {
          if (hasArrayItem(nodes)) {
            nodes.forEach(node => {
              parentKeys = parentKeys.concat(node.key);
              if (matchedText[node.key] && !hiddenSelfAndChildrenKeys.has(node.key)) {
                result = result.concat(parentKeys);
              }
              result = getDisplayFolderKey(node.children, parentKeys, result);
              const index = parentKeys.indexOf(node.key);
              parentKeys = parentKeys.slice(0, index);
            });
          }

          return result;
        };

        displayFolderKeySet = new Set(getDisplayFolderKey(clonedFolderTreeData));
      }

      return filterHiddenNodes(clonedFolderTreeData);
    },
    {
      refreshDeps: [folderTreeData, searchText],
      debounceWait: 500,
    },
  );

  const loading = useMemo(() => handleLoading || queryLoading, [handleLoading, queryLoading]);

  useImperativeHandle(actionRef, () => ({
    folderTreeData,
    loading,
  }));

  // 扁平化的树形结构
  const selectOptions = React.useMemo(() => {
    const flattenedTreeData = (folderTreeData as any)?.flattenedTreeData ?? [];
    return flattenedTreeData.map(data => ({
      value: data.key,
      label: data.name,
    }));
  }, [folderTreeData]);

  const dropdownRender = useMemoizedFn(() => {
    const titleRender = node => {
      const matchedClassName = cx('matched');
      const matchedText = matchedFolderText[node.key];
      const highlightMatchedNodeName = matchedText
        ? node.name.replace(matchedText, `<span class="${matchedClassName}">${matchedText}</span>`)
        : `<span>${node.name}</span>`;
      return (
        <>
          <OverflowTooltip title={node.name}>
            <span
              className={cx('tree-node-name', Boolean(matchedText) && 'highlight')}
              dangerouslySetInnerHTML={{ __html: highlightMatchedNodeName }}
            />
          </OverflowTooltip>
        </>
      );
    };

    const handleTreeExpand = expandedKeys => {
      setTreeAutoExpandParent(false);
      setTreeExpandedKeys(expandedKeys);
    };

    const handleTreeSelect = selectedKeys => {
      setTreeSelectedKeys(selectedKeys);
      setSelectedValue(selectedKeys);
      // 选中值后关闭下拉框
      setSelectOpenProp(false);
    };

    return (
      <>
        <div className={cx('search-input-container')}>
          <Input
            value={searchText}
            prefix={<SearchOutlined />}
            className={cx('search-input')}
            placeholder={t('components.business.repositorySelectorField.placeholder1')}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>

        <Tree.DirectoryTree
          disabled={loading}
          treeData={treeData}
          expandAction={false}
          className={cx('tree')}
          titleRender={titleRender}
          onExpand={handleTreeExpand}
          onSelect={handleTreeSelect}
          selectedKeys={treeSelectedKeys}
          expandedKeys={treeExpandedKeys}
          autoExpandParent={treeAutoExpandParent}
          icon={({ expanded }) => (expanded ? <FileOpen /> : <FileClose />)}
          switcherIcon={<CaretDownOutlined style={{ color: '#878C96' }} />}
        />
      </>
    );
  });

  const handleDropdownVisibleChange = useMemoizedFn(open => {
    // 打卡下拉框需要重置搜索框文本
    if (open) {
      setSearchText('');
    }
    setSelectOpenProp(open);
  });

  const handleClear = useMemoizedFn(() => {
    setTreeSelectedKeys([]);
    setSelectedValue([]);
  });

  // 默认值初始化
  const isDefaultValueInitialRef = React.useRef(false);
  React.useEffect(() => {
    if (!isDefaultValueInitialRef.current && selectedValue?.[0] && treeData) {
      isDefaultValueInitialRef.current = true;
      setTreeSelectedKeys(selectedValue);
    }
  }, [selectedValue, treeData]);

  return (
    <Select
      allowClear
      open={selectOpenProp}
      value={selectedValue}
      onClear={handleClear}
      options={selectOptions}
      dropdownRender={dropdownRender}
      placeholder={t('components.business.repositorySelectorField.placeholder2')}
      onDropdownVisibleChange={handleDropdownVisibleChange}
      getPopupContainer={triggerNode => triggerNode.parentElement}
      {...restSelectProps}
    />
  );
};
