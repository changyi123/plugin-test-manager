import React from 'react';
import { cloneDeep } from 'lodash';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import { includeAll, exclude, includeItem } from './helper';
import { useDebounce } from 'ahooks';
import { Select, Input } from 'antd';
import { SearchOutlined } from '@/icons';
import TestDetailsSelectorList from './TestDetailsSelectorList';

import cx from './TestDetailSelector.less';
import RepositoryFolderTree, { ActionType } from '../RepositoryFolderTree';

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

  const repositoryFolderTreeRef = React.useRef<ActionType>();

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

  const handleWorkspaceChange = key => {
    folderCheckedCacheRef.current = {
      ...folderCheckedCacheRef.current,
      [selectedWorkspaceKey]: folderCheckedKey,
    };

    // 切换
    setSelectedWorkspaceKey(key);
    setFolderCheckedKey(folderCheckedCacheRef.current[key] ?? DEFAULT_CHECKED_KEY);
  };

  const debouncedFolderSearchValue = useDebounce(folderSearchValue, { wait: 400 });
  React.useEffect(() => {
    repositoryFolderTreeRef.current.filterFolder(debouncedFolderSearchValue);
  }, [debouncedFolderSearchValue]);

  React.useEffect(() => {
    setFolderSearchValue('');
    setDetailSearchValue('');
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
        <div className={cx('selector-container')}>
          <div className={cx('folder-selector')}>
            <Input
              placeholder="搜索用例库分组"
              value={folderSearchValue}
              className={cx('search-input')}
              addonBefore={<SearchOutlined />}
              onChange={e => setFolderSearchValue(e.target.value)}
            />
            <div className={cx('tree-box')}>
              <RepositoryFolderTree
                workspaceKey={workspaceKey}
                shouldIncludeSubFolder={false}
                actionRef={repositoryFolderTreeRef}
                onFolderSelect={(_, nodeInfo) => setSelectedNode(nodeInfo.selectedFolder)}
              />
            </div>
          </div>
          <div className={cx('detail-selector-container')}>
            <TestDetailsSelectorList
              workspaceKey={selectedWorkspaceKey}
              selectedNode={selectedNode}
              detailSearchValue={detailSearchValue}
              ignoreTestDetailIds={ignoreTestDetailIds ?? []}
              selectedTestDetailIds={selectedTestDetailIds}
              setSelectedTestDetailIds={setSelectedTestDetailIds}
            />
          </div>
        </div>
        {/* <Empty style={{ paddingTop: 100 }} description="当前用例库未创建用例模块" /> */}
      </div>
    </div>
  );
};

export default TestDetailSelector;
