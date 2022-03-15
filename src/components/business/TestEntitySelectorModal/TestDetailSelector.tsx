import React from 'react';
import { omit, cloneDeep } from 'lodash';
import { TestType } from '@/lib/constants';
import { getFolderTree } from '@/lib/api/repository';
import { useAllTestWorkspace } from '@/lib/hooks/useTest';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { includeAll, exclude, includeItem } from './helper';
import { traverseTreeNodes } from '@/pages/repository/hook';
import SearchInput from '@/components/business/SearchInput';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { useRequest, useReactive, useInfiniteScroll } from 'ahooks';
import { hasArrayItem, escapeMatchesQueryArg } from '@/lib/utils/helper';
import { Select, Tree, Empty, Checkbox, Spin, Tooltip, Input } from '@osui/ui';
import {
  FileTextOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  SearchOutlined,
  CheckOutlined,
} from '@/icons';

import cx from './TestDetailSelector.less';

const REQUEST_LIMIT = 20;

type TestDetailSelectorProps = {
  workspaceKey: string;
  isSingleMode?: boolean;
  isWorkspaceIsolate: boolean;
  ignoreTestDetailIds?: string[];
  onTestDetailSelect?: (testDetails) => void;
};

const TestDetailSelector: React.FC<TestDetailSelectorProps> = props => {
  const {
    workspaceKey,
    isSingleMode,
    ignoreTestDetailIds,
    onTestDetailSelect,
    isWorkspaceIsolate,
  } = props;

  const baseSearchState = useReactive({
    nameLike: '',
    notIn: ignoreTestDetailIds ?? null,
    orderByCratedAt: 'desc' as 'asc' | 'desc',
  });

  // 目录搜索
  const [folderSearchValue, setFolderSearchValue] = React.useState(null);

  // tree checked key
  const [folderCheckedKey, setFolderCheckedKey] = React.useState({
    checked: [],
    halfChecked: [],
  });
  // 选中目录树
  const [selectedNode, setSelectedNode] = React.useState(null);
  // 选中测试用例 id
  const [selectedTestDetailIds, setSelectedTestDetailIds] = React.useState([]);
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
            select: ['objectId'],
          },
        );

        return data.map(item => item.objectId);
      };
      const [treeNodes, allTestDetailIds] = await Promise.all([
        getFolderTree(selectedWorkspaceKey),
        getAllTestDetailEntityIds(selectedWorkspaceKey),
      ]);

      const allTestDetailIdSet = new Set<string>(allTestDetailIds);
      traverseTreeNodes(treeNodes, node => {
        // FIXME: 优化渲染 title 逻辑
        node.title = <OverflowTooltip title={node.name}>{node.name}</OverflowTooltip>;
        node.disableCheckbox = !node.testDetailIds.length;
        // 测试实体在测试模块内只能被关联一次
        node.testDetailIds = node.testDetailIds.filter(id => {
          if (allTestDetailIdSet.has(id)) {
            allTestDetailIdSet.delete(id);
            return true;
          }
          return false;
        });
      });

      const RootFolder = {
        key: `ROOT_FOLDER_${selectedWorkspaceKey}`,
        name: '未分组用例',
        title: '未分组用例',
        parentId: null,
        testDetailIds: Array.from(allTestDetailIdSet),
        icon: <FileTextOutlined />,
        children: [],
      };

      return [RootFolder].concat(treeNodes);
    },
    {
      ready: Boolean(selectedWorkspaceKey),
      refreshDeps: [selectedWorkspaceKey],
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

  const { data: testDetailData, loading: testDetailDataLoading } = useInfiniteScroll(
    async params => {
      const { offset = 0 } = params ?? ({} as any);

      const baseQueryParams = omit(baseSearchState, ['orderByCratedAt']);
      const baseQueryOptions = {
        ascendingBy: baseSearchState.orderByCratedAt === 'asc' ? ['createdAt'] : null,
        descendingBy: baseSearchState.orderByCratedAt === 'desc' ? ['createdAt'] : null,
      };
      const { results, count } = await getTestEntitiesByQuery(
        {
          ...baseQueryParams,
          in: selectedNode.testDetailIds,
          workspaceKey: selectedWorkspaceKey,
        },
        {
          offset,
          limit: REQUEST_LIMIT,
          ...baseQueryOptions,
        },
      );

      const nextOffset = offset + REQUEST_LIMIT;

      return {
        count,
        list: results,
        offset: nextOffset < count ? nextOffset : undefined,
      };
    },
    {
      target: detailSelectorRef,
      threshold: 300,
      reloadDeps: [JSON.stringify(baseSearchState), JSON.stringify(selectedNode?.testDetailIds)],
      isNoMore: data => data?.offset === undefined,
    },
  );

  // 当前目录全选
  const handleFolderCheckAll = (checked, testDetailIds) => {
    setSelectedTestDetailIds(prevState => {
      if (checked) {
        return Array.from([].concat(testDetailIds, prevState));
      } else {
        // 取消选中选差集
        return exclude(prevState, testDetailIds);
      }
    });
  };

  const handleCheck = (_, { checked, node }) => {
    if (!node.testDetailIds.length) return;
    const testDetailIds = node.testDetailIds;
    handleFolderCheckAll(checked, testDetailIds);

    setFolderCheckedKey(prevState => {
      if (checked) {
        return {
          ...prevState,
          checked: prevState.checked.concat(node.key),
        };
      } else {
        return {
          ...prevState,
          checked: exclude(prevState.checked, [node.key]),
        };
      }
    });
  };

  const handleWorkspaceChange = key => {
    folderCheckedCacheRef.current = {
      ...folderCheckedCacheRef.current,
      [selectedWorkspaceKey]: folderCheckedKey,
    };

    // 切换
    setSelectedWorkspaceKey(key);
    setFolderCheckedKey(folderCheckedCacheRef.current[key] ?? []);
  };

  const handleTestDetailCheck = (checked, key) => {
    const needUpdateTestDetailIds = checked
      ? selectedTestDetailIds.concat(key)
      : selectedTestDetailIds.filter(k => k !== key);

    setSelectedTestDetailIds(needUpdateTestDetailIds);
  };

  const TreeComponentCheckProps = React.useMemo(() => {
    return isSingleMode ? {} : { checkable: true, checkStrictly: true };
  }, [isSingleMode]);

  React.useEffect(() => {
    setFolderSearchValue('');
    baseSearchState.nameLike = '';
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
        <SearchInput
          text="搜索"
          className={cx('search')}
          value={baseSearchState.nameLike}
          onSearch={value => (baseSearchState.nameLike = value)}
        />
      </div>
      <Select
        showSearch
        optionFilterProp="title"
        value={selectedWorkspaceKey}
        disabled={isWorkspaceIsolate}
        options={workspaceSelectOptions}
        onChange={handleWorkspaceChange}
        className={cx('workspace-selector')}
      />
      <Spin spinning={testDetailDataLoading}>
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
                  treeData={treeData}
                  onCheck={handleCheck}
                  className={cx('tree')}
                  checkedKeys={folderCheckedKey}
                  onSelect={(_, { node }) => setSelectedNode(node)}
                  selectedKeys={[selectedNode?.key].filter(Boolean)}
                />
              </div>
              <div className={cx('detail-selector-container')}>
                <div className={cx('detail', 'header')}>
                  {!isSingleMode ? (
                    <Checkbox
                      disabled={!selectedNode?.testDetailIds.length}
                      onChange={ev => {
                        handleFolderCheckAll(ev.target.checked, selectedNode.testDetailIds);
                      }}
                      checked={
                        selectedNode?.testDetailIds.length &&
                        includeAll(selectedTestDetailIds, selectedNode?.testDetailIds)
                      }
                      className={cx('checkbox')}
                    />
                  ) : null}
                  <span>共 {testDetailData?.count ?? 0} 条用例</span>
                  <Tooltip title="创建时间排序">
                    <span
                      className={cx('action')}
                      onClick={() => {
                        baseSearchState.orderByCratedAt =
                          baseSearchState.orderByCratedAt === 'asc' ? 'desc' : 'asc';
                      }}
                    >
                      <span className={cx('icon')}>
                        <CaretUpOutlined
                          className={cx(baseSearchState.orderByCratedAt === 'asc' && 'activity')}
                        />
                        <CaretDownOutlined
                          className={cx(baseSearchState.orderByCratedAt === 'desc' && 'activity')}
                        />
                      </span>
                      <span>{baseSearchState.orderByCratedAt === 'asc' ? '最早' : '最晚'}</span>
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
                            checked={selectedTestDetailIds.includes(testDetail.objectId)}
                          />
                        ) : null}
                        <OverflowTooltip title={testDetail.reference?.name}>
                          {testDetail.reference?.name ?? '事项被删除'}
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
                  <Empty style={{ paddingTop: 100 }} description="当前目录未关联测试用例" />
                )}
              </div>
            </div>
          ) : repositoryTreeDataLoading ? null : (
            <Empty style={{ paddingTop: 100 }} description="当前用例库未创建用例模块" />
          )}
        </div>
      </Spin>
    </div>
  );
};

export default TestDetailSelector;
