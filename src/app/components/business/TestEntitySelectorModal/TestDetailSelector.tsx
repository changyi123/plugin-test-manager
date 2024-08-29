import { useDebounce } from 'ahooks';
import { Input, Select } from 'antd';
import { cloneDeep, isEqual } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';

import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { SearchOutlined } from '@/icons';
import { TestLinkType, TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import { SearchSelectors } from '@/lib/utils/iql';

import RepositoryFolderTree, { ActionType } from '../RepositoryFolderTree';
import { exclude, includeAll, includeItem } from './helper';
import cx from './TestDetailSelector.less';
import TestDetailsSelectorList from './TestDetailsSelectorList';

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
  validateCaseStatus?: boolean;
  showDefaultRange?: boolean;
};

const tabsList = [
  {
    label: 'allRepository',
    key: 'repository',
  },
  {
    label: 'testPlan',
    key: 'plan',
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
    validateCaseStatus,
    showDefaultRange,
  } = props;

  const { testCaseFieldKeys } = useBaseAction();
  const { t } = useI18n();
  const repositoryFolderTreeRef = React.useRef<ActionType>();
  const detailSearchRef = useRef(null);
  const [selectors, setSelectors] = React.useState<SearchSelectors>();
  const searchName = useMemo(() => (selectors?.[0] as any)?.name?.value, [selectors]);
  const {
    config: { iql },
  } = useTestConfig();
  const defaultIql = useMemo(() => {
    return iql?.replace(/\bplanId\b/g, planId) || '';
  }, [iql, planId]);

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

  useEffect(() => {
    setSelectedWorkspaceKey(workspaceKey);
    // 清空选中
    setFolderCheckedKey(DEFAULT_CHECKED_KEY);
    setFolderSearchValue('');
    setSelectedTestDetailIds([]);
  }, [workspaceKey]);

  const treeProps: any = useMemo(() => {
    return planId && treeType === 'plan'
      ? {
          hideEmptyFolder: true,
          params: {
            query: {
              workspaceKey: selectedWorkspaceKey,
              type: TestType.Case,
            },
            selector: selectors,
            fields: ['name'],
            linkType: TestLinkType.CaseLinkPlan,
            sourceIds: [planId],
            destinationType: TestType.Case,
          },
        }
      : selectors
      ? {
          hideEmptyFolder: true,
          params: {
            query: {
              workspaceKey: selectedWorkspaceKey,
              type: TestType.Case,
            },
            selector: selectors,
            fields: ['name'],
          },
        }
      : { isShowAll: true };
  }, [planId, treeType, selectedWorkspaceKey, selectors]);

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
      {/* <div className={cx('title')}>
        {t('components.business.testEntitySelectorModal.selectRepository')}
        <span className={cx('description')}>
          （{t('components.business.testEntitySelectorModal.selectRepositoryTips')}）
        </span>
      </div> */}
      <div className={cx('search-box')}>
        {/* 跨空间规划测试用例不生效，屏蔽切换空间入口 */}
        {false && (
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
        )}
        <FilterSearch
          filterId="testDetailSelector"
          showDefaultRange={showDefaultRange}
          ref={detailSearchRef}
          onSearch={setSearchParams}
          className={`${cx('plan-page-layout-search')} ${cx('common-search-box')}`}
          fields={getFilterFields([].concat(SystemFieldKeys, testCaseFieldKeys))}
          testType={TestType.Case}
          defaultIql={defaultIql}
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
              className={cx('search-input-selector', planId ? 'tab-layout' : '')}
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
                // isModelTree={true}
                {...treeProps}
              />
            </div>
          </div>
          <div className={cx('detail-selector-container')}>
            <TestDetailsSelectorList
              workspaceKey={selectedWorkspaceKey}
              selectedNode={selectedNode}
              searchName={searchName}
              selectors={selectors}
              ignoreTestDetailIds={ignoreTestDetailIds ?? []}
              selectedTestDetailIds={selectedTestDetailIds}
              setSelectedTestDetailIds={setSelectedTestDetailIds}
              treeType={treeType}
              planId={planId}
              treeProps={treeProps}
              validateCaseStatus={validateCaseStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestDetailSelector;
