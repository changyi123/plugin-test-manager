import React from 'react';
import { TestType } from '@/lib/constants';
import { pick, cloneDeep } from 'lodash';
import { getFolderTree } from '@/lib/api/repository';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { includeAll, exclude, includeItem } from './helper';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { useRequest } from 'ahooks';
import { hasArrayItem, escapeMatchesQueryArg } from '@/lib/utils/helper';
import { Select, Tree, Empty, Input } from 'antd';
import { traverseTreeNodes, appendGroupedDetailIdsToTreeNode } from '@/pages/repository/util';
import { CaretDownOutlined, FileClose, FileOpen, SearchOutlined } from '@/icons';
import TestDetailsSelectorList from './TestDetailsSelectorList';

import cx from './TestDetailSelector.less';

const DEFAULT_CHECKED_KEY = {
  checked: [],
  halfChecked: [],
};

type TestDetailSelectorProps = {
  workspaceKey: string;
  isSingleMode?: boolean;
  isWorkspaceIsolate: boolean;
  ignoreTestDetailIds?: string[];
  onTestDetailSelect?: (testDetails) => void;
};

const { Search } = Input;

const TestDetailSelector: React.FC<TestDetailSelectorProps> = props => {
  const {
    workspaceKey,
    isSingleMode,
    ignoreTestDetailIds,
    onTestDetailSelect,
    isWorkspaceIsolate,
  } = props;

  // 目录搜索
  const [folderSearchValue, setFolderSearchValue] = React.useState('');
  const [detailSearchValue, setDetailSearchValue] = React.useState('');

  // tree checked key
  const [folderCheckedKey, setFolderCheckedKey] = React.useState(DEFAULT_CHECKED_KEY);
  // 选中目录树
  const [selectedNode, setSelectedNode] = React.useState(null);
  // 选中测试用例 id
  const [selectedTestDetailIds, setSelectedTestDetailIds] = React.useState([]);
  // 选中空间
  const [selectedWorkspaceKey, setSelectedWorkspaceKey] = React.useState(workspaceKey);

  const folderCheckedCacheRef = React.useRef({} as Record<string, any>);

  // 测试案例库选中
  const allTestWorkspaces = useAllTestWorkspace();
  const workspaceSelectOptions = React.useMemo(() => {
    return (
      allTestWorkspaces?.map(workspace => ({
        label: (
          <p>
            <span>{workspace.name}</span>
            <span style={{ color: '#aaa', fontSize: 12 }}>({workspace.key})</span>
          </p>
        ),
        title: workspace.name + workspace.key,
        value: workspace.key,
      })) ?? []
    );
  }, [allTestWorkspaces]);

  const { data: repositoryTreeData = [], loading: repositoryTreeDataLoading } = useRequest(
    async () => {
      // 获取当前空间内所有的测试实体
      const getAllTestDetailEntityIds = async workspaceKey => {
        const { results: data } = await getTestEntitiesByQuery(
          {
            type: TestType.TestDetail,
            workspaceKey,
          },
          {
            limit: 99999,
            include: [],
            select: ['objectId', 'repository'],
          },
        );

        return data.map(item => pick(item, ['objectId', 'repository']));
      };

      const [treeNodes, allTestDetailIds] = await Promise.all([
        getFolderTree(selectedWorkspaceKey),
        getAllTestDetailEntityIds(selectedWorkspaceKey),
      ]);

      const ungroupedDetailIds = appendGroupedDetailIdsToTreeNode(treeNodes, allTestDetailIds);

      traverseTreeNodes(treeNodes, node => {
        // FIXME: 优化渲染 title 逻辑
        node.title = <OverflowTooltip title={node.name}>{node.name}</OverflowTooltip>;
        node.disableCheckbox = !node.testDetailIds.length;
      });

      const RootFolder = {
        key: `ROOT_FOLDER_${selectedWorkspaceKey}`,
        name: '未分组用例',
        title: '未分组用例',
        parentId: null,
        testDetailIds: ungroupedDetailIds,
        icon: <FileClose />,
        children: [],
      };

      return [RootFolder].concat(treeNodes);
    },
    {
      ready: Boolean(selectedWorkspaceKey),
      refreshDeps: [selectedWorkspaceKey],
      cacheKey: `Repository_${selectedWorkspaceKey}`,
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  const treeData = React.useMemo(() => {
    if (!folderSearchValue) return repositoryTreeData;

    const newTreeData = cloneDeep(repositoryTreeData);
    const escapedRegExp = escapeMatchesQueryArg(folderSearchValue);
    traverseTreeNodes(newTreeData, node => {
      node.display = escapedRegExp.test(node.name);
    });

    traverseTreeNodes(newTreeData, node => {
      let hasDisplay = node.display;
      hasDisplay ||
        traverseTreeNodes([node], node => {
          if (node.display) {
            hasDisplay = true;
          }
        });
      if (!hasDisplay) {
        node.children = [];
      }
    });

    return newTreeData.filter(node => node.children?.length || (node as any).display);
  }, [repositoryTreeData, folderSearchValue]);

  const handleWorkspaceChange = key => {
    folderCheckedCacheRef.current = {
      ...folderCheckedCacheRef.current,
      [selectedWorkspaceKey]: folderCheckedKey,
    };

    // 切换
    setSelectedWorkspaceKey(key);
    setFolderCheckedKey(folderCheckedCacheRef.current[key] ?? DEFAULT_CHECKED_KEY);
  };

  const TreeComponentCheckProps = React.useMemo(() => {
    return isSingleMode
      ? {}
      : {
          // checkable: true, checkStrictly: true
        };
  }, [isSingleMode]);

  React.useEffect(() => {
    setFolderSearchValue('');
    setDetailSearchValue('');
    // baseSearchState.nameLike = '';
    // 单选模式切换时重置选中项
    isSingleMode && setSelectedTestDetailIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceKey]);

  React.useEffect(() => {
    onTestDetailSelect?.(selectedTestDetailIds);
  }, [onTestDetailSelect, selectedTestDetailIds]);

  React.useEffect(() => {
    const currentFolderTestDetailIds = selectedNode?.testDetailIds;
    if (!currentFolderTestDetailIds || isSingleMode) return;
    setFolderCheckedKey(prevState => {
      const newState = cloneDeep(prevState);
      // 判断 selectedTestDetailIds 包含当前所有节点的 testDetailIds
      const isIncludeAll =
        selectedTestDetailIds.length &&
        currentFolderTestDetailIds.length &&
        includeAll(selectedTestDetailIds, currentFolderTestDetailIds);

      if (isIncludeAll) {
        newState.checked = newState.checked.concat(selectedNode.key);
        newState.halfChecked = exclude(newState.halfChecked, [selectedNode.key]);
      } else {
        // 判断 selectedTestDetailIds 含当前节点的任意 testDetailIds
        const isIncludeItem = includeItem(selectedTestDetailIds, currentFolderTestDetailIds);
        if (isIncludeItem) {
          newState.halfChecked = newState.halfChecked.concat(selectedNode.key);
        } else {
          newState.halfChecked = exclude(newState.halfChecked, [selectedNode.key]);
        }
        newState.checked = exclude(newState.checked, [selectedNode.key]);
      }
      return newState;
    });
  }, [isSingleMode, selectedNode, selectedTestDetailIds]);

  React.useEffect(() => {
    setSelectedNode(repositoryTreeData[0]);
  }, [repositoryTreeData]);

  return (
    <div className={cx('container')}>
      <div className={cx('title')}>
        选择用例库
        <span className={cx('description')}>（仅可选择当前拥有权限的用例库）</span>
      </div>
      <div className={cx('search-box')}>
        <Select
          showSearch
          getPopupContainer={trigNode => trigNode.parentElement}
          optionFilterProp="title"
          value={selectedWorkspaceKey}
          disabled={isWorkspaceIsolate}
          options={workspaceSelectOptions}
          onChange={handleWorkspaceChange}
          className={cx('workspace-selector')}
        />
        <Search
          className={cx('search')}
          placeholder="请输入用例标题"
          allowClear
          onSearch={val => setDetailSearchValue(val)}
        />
      </div>
      <div className={cx('main')}>
        {hasArrayItem(repositoryTreeData) ? (
          <div className={cx('selector-container')}>
            <div className={cx('folder-selector')}>
              <Input
                placeholder="搜索用例库分组"
                value={folderSearchValue}
                className={cx('search-input')}
                addonBefore={<SearchOutlined />}
                onChange={e => setFolderSearchValue(e.target.value)}
              />
              <Tree.DirectoryTree
                showIcon
                {...TreeComponentCheckProps}
                icon={({ expanded }) => (expanded ? <FileOpen /> : <FileClose />)}
                switcherIcon={<CaretDownOutlined style={{ color: '#878C96' }} />}
                treeData={treeData}
                className={cx('tree')}
                expandAction={false}
                checkedKeys={folderCheckedKey}
                onSelect={(_, { node }) => setSelectedNode(node)}
                selectedKeys={[selectedNode?.key].filter(Boolean)}
                rootStyle={{ height: 'calc(100% - 40px)' }}
              />
            </div>
            <div className={cx('detail-selector-container')}>
              <TestDetailsSelectorList
                workspaceKey={workspaceKey}
                selectedNode={selectedNode}
                detailSearchValue={detailSearchValue}
                ignoreTestDetailIds={ignoreTestDetailIds ?? []}
                selectedTestDetailIds={selectedTestDetailIds}
                setSelectedTestDetailIds={setSelectedTestDetailIds}
              />
            </div>
          </div>
        ) : repositoryTreeDataLoading ? null : (
          <Empty style={{ paddingTop: 100 }} description="当前用例库未创建用例模块" />
        )}
      </div>
    </div>
  );
};

export default TestDetailSelector;
