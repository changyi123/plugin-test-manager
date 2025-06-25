import { SearchOutlined } from '@ant-design/icons';
import { useDebounce, useRequest } from 'ahooks';
import { Input, Select, Table } from 'antd';
import { cloneDeep, isEqual, uniqBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { getTestEntityByQuery, handleSelector } from '@/lib/api/item';
import { TestLinkType, TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import { SearchSelectors, selectorToIql } from '@/lib/utils/iql';

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
  isPlanForTestSet?: boolean;
  caseSetId?: string;
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
  {
    label: 'testCaseSet',
    key: 'testcaseset',
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
    caseSetId,
    isPlanForTestSet = false,
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
  // 预览的用例集 id
  const [previewCaseSetId, setPreviewCaseSetId] = React.useState<string>('');
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

  const finalTabs = useMemo(() => {
    let tabs = cloneDeep(tabsList);
    if (!planId) {
      tabs = tabs.filter(item => item.key !== 'plan');
    }
    return tabs;
  }, [planId, isPlanForTestSet]);

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

  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<string>>([]);

  const onCaseSelectChange = async newSelectedRowKeys => {
    setSelectedTestDetailIds(newSelectedRowKeys);
  };

  const caseSetColumns = [
    {
      title: t('common.testCaseSet'),
      dataIndex: 'name',
    },
  ];
  const [cacheCaseSetIdToTestCaseMap, setCacheCaseSetIdToTestCaseMap] = useState<
    Record<string, Array<object>>
  >({});

  // 获取选中全部用例集下的用例，为了左下角的数字用
  const { data: caseSetData } = useRequest(
    async () => {
      const res = [];
      if (treeType !== 'testcaseset') return res;
      const result = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.CaseSet,
        },
        fields: ['name', 'id', 'objectId'],
        selector: selectors,
        notConcatField: true,
        limit: 9999,
      });

      return result?.list;
    },
    {
      refreshDeps: [treeType, selectors],
      ready: Boolean(treeType === 'testcaseset'),
    },
  );

  const [testSetLoading, setTestSetLoading] = useState(false);

  // 获取当前选中或者点击的用例集下的用例
  useRequest(
    async () => {
      if (treeType !== 'testcaseset') return [];
      if (selectedRowKeys?.length === 0) {
        setSelectedTestDetailIds([]);
        return [];
      }
      setTestSetLoading(true);
      const filterSelectors = selectorToIql(handleSelector(selectors));
      try {
        const { list } = await getTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
            type: TestType.Case,
          },
          fields: ['id', 'objectId'],
          limit: 9999,
          selector: `${
            filterSelectors ? `${filterSelectors} and ` : ''
          }'测试用例集' in [${selectedRowKeys.map(item => `'${item.toString()}'`).join(',')}]`,
        });
        let newList = list;
        if (list?.length) {
          newList = uniqBy(newList, 'objectId');
          const ids = newList.map(item => item.objectId);
          setSelectedTestDetailIds(ids);
        }
        return list;
      } finally {
        setTestSetLoading(false);
      }
    },
    {
      refreshDeps: [selectedRowKeys],
      ready: treeType === 'testcaseset',
    },
  );

  // 获取当前选中或者点击的用例集下的用例
  const { data: curTestSetCases } = useRequest(
    async () => {
      if (treeType !== 'testcaseset') return [];
      if (!previewCaseSetId) {
        return [];
      }
      if (cacheCaseSetIdToTestCaseMap[previewCaseSetId]) {
        return cacheCaseSetIdToTestCaseMap[previewCaseSetId];
      }
      setTestSetLoading(true);
      const filterSelectors = selectorToIql(handleSelector(selectors));
      try {
        const { list } = await getTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
            type: TestType.Case,
          },
          fields: ['name', 'id', 'objectId'],
          limit: 9999,
          selector: `${
            filterSelectors ? `${filterSelectors} and ` : ''
          }'测试用例集' in ['${previewCaseSetId}']`,
        });
        setCacheCaseSetIdToTestCaseMap({
          ...cacheCaseSetIdToTestCaseMap,
          [previewCaseSetId]: list,
        });
        return list;
      } finally {
        setTestSetLoading(false);
      }
    },
    {
      refreshDeps: [previewCaseSetId],
      ready: treeType === 'testcaseset',
    },
  );

  const filterTestCaseSets = useMemo(() => {
    if (treeType !== 'testcaseset' || (caseSetData || [])?.length === 0) {
      return [];
    }
    return caseSetData.filter(item => {
      if (folderSearchValue) {
        return item.name.includes(folderSearchValue);
      }
      return true;
    });
  }, [folderSearchValue, caseSetData, treeType]);

  const caseSetRowSelection = {
    selectedRowKeys,
    onSelect: async (record, selected) => {
      if (selected) {
        setSelectedRowKeys(prev => [...prev, record.id]); // 新增行
        setPreviewCaseSetId(record.id);
      } else {
        setSelectedRowKeys(prev => prev.filter(row => row !== record.id)); // 移除行
        setPreviewCaseSetId('');
      }
    },
    onSelectAll: (selected, selectedRows) => {
      if (selected) {
        setSelectedRowKeys(selectedRows.map(item => item.id));
      } else {
        setSelectedRowKeys([]);
      }
      setPreviewCaseSetId('');
    },
  };

  const onCaseSetRow = useCallback(record => {
    return {
      onClick: () => {
        eval('debugger');
        setPreviewCaseSetId(record.id);
      }, // 点击行
    };
  }, []);

  const caseRowSelection = {
    selectedRowKeys: (ignoreTestDetailIds ?? []).concat(selectedTestDetailIds),
    onChange: onCaseSelectChange,
    getCheckboxProps: () => ({
      disabled: true, // 根据属性禁用
    }),
  };

  // 改写之前的代码，让逻辑更加清晰
  const treeProps: any = useMemo(() => {
    if (planId && treeType === 'plan') {
      return {
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
      };
    } else if (treeType === 'testcaseset') {
      return {
        hideEmptyFolder: false,
        params: {
          query: {
            workspaceKey: selectedWorkspaceKey,
            type: TestType.CaseSet,
          },
          fields: ['name'],
        },
      };
    } else if (selectors) {
      return {
        hideEmptyFolder: true,
        params: {
          query: {
            workspaceKey: selectedWorkspaceKey,
            type: TestType.Case,
          },
          selector: selectors,
          fields: ['name'],
        },
      };
    } else {
      return {
        isShowAll: showDefaultRange ? !iql : true,
      };
    }
  }, [planId, treeType, selectedWorkspaceKey, selectors, showDefaultRange, iql]);

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
  const inputPlaceHolder = React.useMemo(() => {
    if (treeType === 'testcaseset') {
      return t('components.business.testEntitySelectorModal.searchTestCaseSet');
    } else {
      return t('components.business.testEntitySelectorModal.searchGroup');
    }
  }, [treeType]);

  useEffect(() => {
    setSelectedTestDetailIds([]);
  }, [treeType]);
  const debouncedFolderSearchValue = useDebounce(folderSearchValue, { wait: 400 });
  React.useEffect(() => {
    // 用例集不是用的目录树，所以不需要过滤
    if (treeType === 'testcaseset') {
      return;
    }
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
          disableComponent={treeType === 'testcaseset'}
          className={`${cx('plan-page-layout-search')} common-search-box`}
          fields={getFilterFields([].concat(SystemFieldKeys, testCaseFieldKeys))}
          testType={TestType.Case}
          defaultIql={defaultIql}
        />
      </div>
      <div className={cx('main')}>
        <div className={cx('selector-container')}>
          <div className={cx('folder-selector')}>
            {
              <div className={cx('tabs-box')}>
                {finalTabs.map(d => (
                  <div
                    className={cx('tab-title', d.key === treeType ? 'actived' : '')}
                    key={d.key}
                    onClick={() => setTreeType(d.key)}
                  >
                    {t(`common.${d.label}`)}
                  </div>
                ))}
              </div>
            }
            <Input
              placeholder={inputPlaceHolder}
              value={folderSearchValue}
              className={cx('search-input-selector', planId ? 'tab-layout' : '')}
              addonAfter={<SearchOutlined />}
              size={planId ? 'middle' : 'large'}
              onChange={e => setFolderSearchValue(e.target.value)}
            />
            {treeType !== 'testcaseset' ? (
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
            ) : (
              <Table
                className={cx('test-case-set-table')}
                rowSelection={caseSetRowSelection}
                columns={caseSetColumns}
                rowKey="id"
                dataSource={filterTestCaseSets}
                pagination={false}
                rowClassName={record => {
                  return record.objectId === previewCaseSetId ? 'row-bg-blue' : '';
                }}
                onRow={onCaseSetRow}
              />
            )}
          </div>
          <div className={cx('detail-selector-container')}>
            {treeType !== 'testcaseset' ? (
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
                caseSetId={caseSetId}
                isPlanForTestSet={isPlanForTestSet}
                treeProps={treeProps}
                validateCaseStatus={validateCaseStatus}
              />
            ) : (
              <Table
                scroll={{ y: 345 }}
                className={cx('test-case-table')}
                rowSelection={caseRowSelection}
                style={{ minHeight: 345 }}
                columns={caseSetColumns}
                rowKey="id"
                dataSource={curTestSetCases}
                loading={testSetLoading}
                pagination={{ showQuickJumper: false, size: 'small' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
TestDetailSelector.displayName = 'TestDetailSelector';
export default TestDetailSelector;
