import React, { useEffect, useMemo, useRef } from 'react';
import { cloneDeep, isEqual } from 'lodash';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import { includeAll, exclude, includeItem } from './helper';
import { useDebounce, useRequest } from 'ahooks';
import { Select, Input } from 'antd';
import { SearchOutlined } from '@/icons';
import TestDetailsSelectorList from './TestDetailsSelectorList';
import RepositoryFolderTree, { ActionType } from '../RepositoryFolderTree';
import { TestLinkType, TestType } from '@/lib/constants';
import { getLinkedTestEntityByQuery } from '@/lib/api/item';
import FilterSearch from '@/components/common/FilterSearch';
import { SearchSelectors } from '@/lib/utils/iql';
import useI18n from '@/lib/hooks/useI18n';

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
  selectValue?: string[];
  planId?: string;
  treeType?: string;
  setTreeType?: (val: string) => void;
};

const tabsList = [
  {
    label: 'testPlan',
    key: 'plan',
  },
  {
    label: 'allRepository',
    key: 'repository',
  },
];

const TestDetailSelector: React.FC<TestDetailSelectorProps> = props => {
  const {
    workspaceKey,
    isSingleMode,
    ignoreTestDetailIds,
    onTestDetailSelect,
    isWorkspaceIsolate,
    selectValue,
    planId,
    treeType,
    setTreeType,
  } = props;
  const { t } = useI18n();
  const repositoryFolderTreeRef = React.useRef<ActionType>();
  const detailSearchRef = useRef(null);
  const [selectors, setSelectors] = React.useState<string | SearchSelectors>();

  // 目录搜索
  const [folderSearchValue, setFolderSearchValue] = React.useState('');

  // tree checked key
  const [folderCheckedKey, setFolderCheckedKey] = React.useState(DEFAULT_CHECKED_KEY);
  // 选中目录树
  const [selectedNode, setSelectedNode] = React.useState(null);
  // 选中测试用例 id
  const [selectedTestDetailIds, setSelectedTestDetailIds] = React.useState<string[] | undefined>(
    [],
  );
  // 选中空间
  const [selectedWorkspaceKey, setSelectedWorkspaceKey] = React.useState(workspaceKey);

  const folderCheckedCacheRef = React.useRef({} as Record<string, any>);

  const setSearchParams = React.useCallback(
    data => {
      if (isEqual(data, selectors)) return;
      setSelectors(data);
    },
    [selectors],
  );

  useEffect(() => {
    setSelectedTestDetailIds(selectValue ?? []);
  }, [selectValue]);

  // 查询当前用例库下所有测试用例
  const { data: planLinkCaseIds } = useRequest(
    async () => {
      if (!planId && !workspaceKey) return [];
      const { list: caseIds } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [planId],
        destinationType: TestType.Case,
        onlySelectId: true,
      });
      return caseIds;
    },
    {
      refreshDeps: [workspaceKey, planId],
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  const treeProps = useMemo(() => {
    return planId && treeType === 'plan'
      ? { scopedTestDetailIds: planLinkCaseIds, hideEmptyFolder: true }
      : {};
  }, [planLinkCaseIds, treeType, planId]);

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
    setSelectors(undefined);
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
        {t('components.business.testEntitySelectorModal.selectRepository')}
        <span className={cx('description')}>
          （{t('components.business.testEntitySelectorModal.selectRepositoryTips')}）
        </span>
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
        <FilterSearch
          ref={detailSearchRef}
          onSearch={setSearchParams}
          className={cx('plan-page-layout-search')}
          extendFields={[]}
          fields={[]}
          testType={TestType.Case}
          hideSelectorTag={true}
        />
      </div>
      <div className={cx('main')}>
        <div className={cx('selector-container')}>
          <div className={cx('folder-selector')}>
            {planId && (
              <div className={cx('tabs-box')}>
                {tabsList.map(d => (
                  <div
                    className={cx('tab-title', d.key === treeType ? 'actived' : '')}
                    key={d.key}
                    onClick={() => setTreeType(d.key)}
                  >
                    {t(`common.${d.label}`)}
                  </div>
                ))}
              </div>
            )}
            <Input
              placeholder={t('components.business.testEntitySelectorModal.searchGroup')}
              value={folderSearchValue}
              className={cx('search-input', planId ? 'tab-layout' : '')}
              addonAfter={<SearchOutlined />}
              size={planId ? 'middle' : 'large'}
              onChange={e => setFolderSearchValue(e.target.value)}
            />
            <div className={cx('tree-box', planId ? 'tab-layout' : '')}>
              <RepositoryFolderTree
                workspaceKey={selectedWorkspaceKey}
                shouldIncludeSubFolder={false}
                actionRef={repositoryFolderTreeRef}
                onFolderSelect={node => setSelectedNode(node)}
                {...treeProps}
              />
            </div>
          </div>
          <div className={cx('detail-selector-container')}>
            <TestDetailsSelectorList
              workspaceKey={selectedWorkspaceKey}
              selectedNode={selectedNode}
              selectors={selectors}
              ignoreTestDetailIds={ignoreTestDetailIds ?? []}
              selectedTestDetailIds={selectedTestDetailIds}
              setSelectedTestDetailIds={setSelectedTestDetailIds}
              treeType={treeType}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDetailSelector;
