import React from 'react';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import SearchInput from '@/components/business/SearchInput';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { hasArrayItem } from '@/lib/utils/helper';
import { useReactive, useInfiniteScroll, useDebounce } from 'ahooks';
import { Select, Empty, Checkbox, Spin, Tooltip, Input } from 'antd';
import {
  ActionType,
  default as RepositoryFolderTree,
} from '@/components/business/RepositoryFolderTree';
import { CaretDownOutlined, CaretUpOutlined, SearchOutlined, CheckOutlined } from '@/icons';
import { TestType } from '@/lib/constants';
import { getTestEntityByQuery } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';

import cx from './InheritTestDetail.less';

const REQUEST_LIMIT = 20;

const DEFAULT_CHECKED_KEY = {
  checked: [],
  halfChecked: [],
};

type InheritTestDetailProps = {
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

const InheritTestDetail: React.FC<InheritTestDetailProps> = props => {
  const {
    workspaceKey,
    isSingleMode,
    ignoreTestDetailIds,
    onTestDetailSelect,
    isWorkspaceIsolate,
    selectValue,
  } = props;
  const { t } = useI18n();

  const baseSearchState = useReactive({
    nameLike: '',
    // notIn: ignoreTestDetailIds ?? null,
    orderByCratedAt: 'asc' as 'asc' | 'desc',
  });

  const repositoryFolderTreeRef = React.useRef<ActionType>();
  // 目录搜索
  const [folderSearchValue, setFolderSearchValue] = React.useState('');
  const [detailSearchValue, setDetailSearchValue] = React.useState('');
  const [requestScopedTestDetailIds, setRequestScopedTestDetailIds] = React.useState([]);

  // tree checked key
  const [folderCheckedKey, setFolderCheckedKey] = React.useState(DEFAULT_CHECKED_KEY);
  // 选中测试用例 id
  const [selectedTestDetailIds, setSelectedTestDetailIds] = React.useState(selectValue);
  // 选中空间
  const [selectedWorkspaceKey, setSelectedWorkspaceKey] = React.useState(workspaceKey);

  const detailSelectorRef = React.useRef();
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

  const { data: testDetailData, loading: testDetailDataLoading } = useInfiniteScroll(
    async params => {
      if (!requestScopedTestDetailIds?.length)
        return {
          count: [],
          list: [],
          offset: 0,
        };

      const { offset = 0 } = params ?? ({} as any);
      // 组装排序
      const baseQueryOptions = {
        ascending: baseSearchState.orderByCratedAt === 'asc' ? ['sortIndex', 'createdAt'] : null,
        descending: baseSearchState.orderByCratedAt === 'desc' ? ['sortIndex', 'createdAt'] : null,
      } as any;
      // 获取测试用例的列表
      const { list, total: count } = await getTestEntityByQuery({
        query: {
          workspaceKey: selectedWorkspaceKey,
          type: TestType.Case,
          name: detailSearchValue,
          id: requestScopedTestDetailIds,
        },
        ...baseQueryOptions,
        limit: 99999,
      });

      const nextOffset = offset + REQUEST_LIMIT;

      return {
        count,
        list,
        offset: nextOffset < count ? nextOffset : undefined,
      };
    },
    {
      target: detailSelectorRef,
      reloadDeps: [JSON.stringify(baseSearchState), requestScopedTestDetailIds],
      isNoMore: data => data?.offset === undefined,
    },
  );

  const handleWorkspaceChange = key => {
    folderCheckedCacheRef.current = {
      ...folderCheckedCacheRef.current,
      [selectedWorkspaceKey]: folderCheckedKey,
    };

    // 切换
    setSelectedWorkspaceKey(key);
    setFolderCheckedKey(folderCheckedCacheRef.current[key] ?? DEFAULT_CHECKED_KEY);
  };

  const handleTestDetailCheck = (checked, key) => {
    const needUpdateTestDetailIds = checked
      ? selectedTestDetailIds.concat(key)
      : selectedTestDetailIds.filter(k => k !== key);

    setSelectedTestDetailIds(needUpdateTestDetailIds);
  };

  const debouncedFolderSearchValue = useDebounce(folderSearchValue, { wait: 400 });
  React.useEffect(() => {
    repositoryFolderTreeRef.current.filterFolder(debouncedFolderSearchValue);
  }, [debouncedFolderSearchValue]);

  React.useEffect(() => {
    setFolderSearchValue('');
    setDetailSearchValue('');
    baseSearchState.nameLike = '';
    // 单选模式切换时重置选中项
    isSingleMode && setSelectedTestDetailIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceKey]);

  React.useEffect(() => {
    onTestDetailSelect?.(selectedTestDetailIds);
  }, [onTestDetailSelect, selectedTestDetailIds]);

  return (
    <div className={cx('container')}>
      <div className={cx('title')}>
        {t('components.business.testEntitySelectorModal.selectRepository')}
        <span className={cx('description')}>
          （{t('components.business.testEntitySelectorModal.selectRepositoryTips')}）
        </span>
        <SearchInput
          text={t('common.search')}
          className={cx('search')}
          value={detailSearchValue}
          onChange={value => setDetailSearchValue(value)}
          onSearch={value => (baseSearchState.nameLike = value)}
        />
      </div>
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
      <Spin spinning={testDetailDataLoading}>
        <div className={cx('main')}>
          <div className={cx('selector-container')}>
            <div className={cx('folder-selector')}>
              <Input
                placeholder={t('components.business.testEntitySelectorModal.searchGroup')}
                value={folderSearchValue}
                className={cx('search-input')}
                addonBefore={<SearchOutlined />}
                onChange={e => setFolderSearchValue(e.target.value)}
              />
              <RepositoryFolderTree
                workspaceKey={selectedWorkspaceKey}
                shouldIncludeSubFolder={true}
                actionRef={repositoryFolderTreeRef}
                onFolderSelect={ids => setRequestScopedTestDetailIds(ids)}
              />
            </div>
            <div className={cx('detail-selector-container')}>
              <div className={cx('detail', 'header')}>
                <span>
                  {`${t('common.tableTotal.0')} ${testDetailData?.count ?? 0} ${t(
                    'components.business.testEntitySelectorModal.case',
                  )}`}
                </span>
                <Tooltip title={t('components.business.testEntitySelectorModal.addTimeSort')}>
                  <span
                    className={cx('action')}
                    onClick={() => {
                      baseSearchState.orderByCratedAt =
                        baseSearchState.orderByCratedAt === 'asc' ? 'desc' : 'asc';
                    }}
                  >
                    <span>
                      {baseSearchState.orderByCratedAt === 'asc'
                        ? t('components.business.testEntitySelectorModal.earliest')
                        : t('components.business.testEntitySelectorModal.latest')}
                    </span>
                    <span className={cx('icon')}>
                      <CaretUpOutlined
                        className={cx(baseSearchState.orderByCratedAt === 'asc' && 'activity')}
                      />
                      <CaretDownOutlined
                        className={cx(baseSearchState.orderByCratedAt === 'desc' && 'activity')}
                      />
                    </span>
                  </span>
                </Tooltip>
              </div>
              {hasArrayItem(testDetailData?.list) ? (
                <ul ref={detailSelectorRef} className={cx('detail-selector')}>
                  {testDetailData.list.map(testDetail => (
                    <li
                      onClick={() =>
                        isSingleMode && setSelectedTestDetailIds([testDetail.objectId])
                      }
                      className={cx('detail', isSingleMode && 'effect')}
                      key={testDetail.objectId}
                    >
                      {!isSingleMode ? (
                        <Checkbox
                          className={cx('checkbox')}
                          onChange={ev => {
                            handleTestDetailCheck(ev.target.checked, testDetail.objectId);
                          }}
                          disabled={ignoreTestDetailIds.includes(testDetail.objectId)}
                          checked={[...ignoreTestDetailIds, ...selectedTestDetailIds].includes(
                            testDetail.objectId,
                          )}
                        />
                      ) : null}
                      <OverflowTooltip title={testDetail?.name}>
                        {testDetail.name ??
                          t('components.business.testEntitySelectorModal.itemDeleted')}
                      </OverflowTooltip>
                      {isSingleMode && selectedTestDetailIds.includes(testDetail.objectId) ? (
                        <div className={cx('action')}>
                          <CheckOutlined className={cx('check-icon')} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : testDetailDataLoading ? null : (
                <Empty
                  style={{ paddingTop: 100 }}
                  description={t('components.business.testEntitySelectorModal.noLinkItem')}
                />
              )}
            </div>
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default InheritTestDetail;
