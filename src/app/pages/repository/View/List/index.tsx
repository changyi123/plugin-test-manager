import { useSDK } from '@projectproxima/plugin-sdk';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, notification, Select } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';

import CreatePermission from '@/components/business/Contianer/CreatePermission';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { copyTestCase, copyTestCaseV2, getTestEntityByQuery, getTestStats } from '@/lib/api/item';
import { getExtendFields, RepositoryModel, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { logPluginVersion } from '@/lib/utils/helper';
import { getRepositoryQuery } from '@/lib/utils/tree';

import { UNGROUPED_FOLDER_KEY } from '../../constant';
import RepoDropDown from '../../RepoDropDown';
import { reverseTreeNodes } from '../../util';
import { ViewComponentProps } from '../type';
import cx from './index.less';
import Table, { ActionType } from './Table';

type GroupedMode = 'all' | 'current';

/** 分组模式筛选器 */
const GroupModeSelector = (props: { mode: GroupedMode; onChange: (mode: GroupedMode) => void }) => {
  const { t } = useI18n();
  return (
    <Select style={{ minWidth: 130 }} value={props.mode} onChange={props.onChange}>
      <Select.Option value="all">{t('page.plan.planPageLayout.right.showChild')}</Select.Option>
      <Select.Option value="current">{t('page.plan.planPageLayout.right.showCur')}</Select.Option>
    </Select>
  );
};

logPluginVersion();

const ListView: React.FC<ViewComponentProps> = ({
  selectedNode,
  folderTreeData,
  onFolderTreeChange,
}) => {
  const { t } = useI18n();
  const tableActionRef = React.useRef<ActionType>();
  const { createItemUseModal, getCreatePermission, testCaseFieldKeys } = useBaseAction();
  const [selector, setSelector] = React.useState(null);
  const [breadcrumbs, setBreadcrumbs] = React.useState([]);
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);
  const [groupedMode, setGroupedMode] = React.useState<GroupedMode>('all');
  const [tableLoading, setTableLoading] = React.useState(false);

  const workspaceKey = useSDK()?.context?.env?.WORKSPACE_KEY;
  const queryLoading = useRef(false);
  const selectNodeKey = selectedNode?.key;

  // 事项数据更新后刷新列表
  useListener('updateItemList', props => {
    console.info('updateItemList');
    if (props?.type === 'create') return;
    if (props?.type === 'delete') {
      refreshAll();
    }
    setTimeout(() => {
      tableActionRef.current.refresh();
    }, 400);
  });

  const repository = useMemo(
    () => getRepositoryQuery(selectedNode, groupedMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedNode?.key, groupedMode],
  );

  const dataSourceGetter = useCallback(
    async params => {
      if (!selectedNode?.key || !workspaceKey || !testCaseFieldKeys)
        return {
          list: [],
          total: 0,
        };
      if (!queryLoading.current) {
        queryLoading.current = true;
        setTableLoading(true);
      }
      const repository = getRepositoryQuery(selectedNode, groupedMode);
      const [{ list: data, total }, quoteCounts] = await Promise.all([
        getTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
            type: TestType.Case,
            ...repository,
          },
          selector,
          fields: [].concat(SystemFieldKeys, testCaseFieldKeys),
          ...params,
        }),
        getTestStats({
          groups: 'referenceCase',
          params: {
            query: {
              workspaceKey: workspaceKey,
              type: TestType.Run,
            },
            limit: 99999,
          } as any,
        }),
      ]);

      const quoteCountMap = new Map();
      quoteCounts.forEach(c => {
        quoteCountMap.set(c.referenceCase, c.count);
      });
      queryLoading.current = false;
      setTableLoading(false);

      return {
        // 加拖拽依赖的 folderKey 数据
        list: data.map(item => ({
          ...item,
          folderKey: item.repository,
          status: item.workflowStatus,
          quoteCount: quoteCountMap.get(item.id) ?? 0,
        })),
        total,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repository, selector, testCaseFieldKeys, workspaceKey],
  );

  const queryDeps = useMemo(
    () =>
      `${selectedNode?.key}_${workspaceKey}_${groupedMode}_${JSON.stringify(
        selector ?? {},
      )}_${testCaseFieldKeys?.sort()?.join(',')}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedNode?.key, workspaceKey, groupedMode, selector, testCaseFieldKeys?.sort()?.join(',')],
  );
  const copyTestCases = useMemoizedFn(async ids => {
    return await copyTestCase({
      caseIds: ids,
      fields: [].concat(SystemFieldKeys, testCaseFieldKeys),
    });
  });
  const copyTestCasesV2 = useMemoizedFn(async queryParams => {
    return await copyTestCaseV2({
      queryParams,
      fields: [].concat(SystemFieldKeys, testCaseFieldKeys),
    });
  });

  useUpdateEffect(() => {
    const breadcrumbs = [];
    reverseTreeNodes(folderTreeData, selectedNode, node => {
      breadcrumbs.unshift(node.name ?? node.title);
    });
    setBreadcrumbs(breadcrumbs);
  }, [setBreadcrumbs, selectedNode, folderTreeData]);

  useUpdateEffect(() => {
    if (groupedMode) {
      tableActionRef.current.resetSelectedRowKeys();
    }
  }, [groupedMode]);

  // const handleDataChange = React.useCallback(async () => {
  //   const treeData = await onFolderTreeChange();
  //   const selectedFolder = getTreeNodeByKey(treeData, selectNodeKey);
  //   if (selectedFolder) {
  //     tableActionRef.current.refresh();
  //   }
  // }, [onFolderTreeChange, selectNodeKey]);

  const refreshAll = React.useCallback(async () => {
    console.info('refreshAll');
    await Promise.all([onFolderTreeChange(), tableActionRef.current.refresh()]);
  }, [onFolderTreeChange]);

  // 处理筛选器搜索
  const handleSelectorSearch = async selector => {
    setSelector(selector);
    // 添加筛选项目需要重置批量选中的 row
    tableActionRef.current.resetSelectedRowKeys();
  };

  const toggleSelection = (visible?: boolean) => {
    visible = typeof visible === 'boolean' ? visible : !tableSelectionVisible;
    setTableSelectionVisible(visible);
    tableActionRef.current.resetSelectedRowKeys();
    tableActionRef.current.toggleSelection(visible);
  };

  const createTestDetail = async () => {
    const { testEntityList } = await createItemUseModal({
      type: TestType.Case,
      extraData: {
        useItemBatchCreate: true,
        repository: selectNodeKey === UNGROUPED_FOLDER_KEY ? null : selectNodeKey,
      },
    });

    const successMessage =
      testEntityList.length > 1
        ? `${testEntityList.length} ${t('page.repository.folderTree.caseCreateSuccessTips.0')}`
        : `${t('page.repository.folderTree.caseCreateSuccessTips.1')}【${
            testEntityList[0]?.name
          }】${t('page.repository.folderTree.caseCreateSuccessTips.2')}`;
    notification.success({
      message: successMessage,
      className: 'test-manager-notification-wrap',
    });
    await refreshAll();
  };

  return (
    <div className={cx('list-view')}>
      <div className={cx('breadcrumb-container')}>
        <OverflowTooltip title={breadcrumbs.join('>')} className={cx('breadcrumb')}>
          <div>
            {breadcrumbs.map((title, index) => (
              <span className={cx(index !== breadcrumbs.length - 1 && 'secondary')} key={index}>
                {title}
                {index !== breadcrumbs.length - 1 && <span className={cx('separator')}>&gt;</span>}
              </span>
            ))}
          </div>
        </OverflowTooltip>
        <div className={cx('actions')}>
          <GroupModeSelector mode={groupedMode} onChange={mode => setGroupedMode(mode)} />
          <Button onClick={() => toggleSelection()}>
            {tableSelectionVisible ? t('common.cancelAction') : t('common.batchAction')}
          </Button>
          <CreatePermission type={TestType.Case}>
            <Button type="primary" onClick={createTestDetail}>
              {t('common.addTestCase')}
            </Button>
          </CreatePermission>
          <RepoDropDown
            type="repository"
            treeNodeData={folderTreeData}
            folderKey={selectNodeKey}
            repository={repository}
            selector={selector}
            // filteredCaseIds={allTestCaseIds}
          />
        </div>
      </div>
      <div className={cx('table-container')} style={{ height: 'calc(100% - 105px)' }}>
        <FilterSearch
          className={cx('filter-search-box')}
          onSearch={handleSelectorSearch}
          fields={getFilterFields([].concat(SystemFieldKeys, testCaseFieldKeys))}
          extendFields={getExtendFields(t)?.filter(field => field.key === RepositoryModel)}
          testType={TestType.Case}
        />
        <Table
          actionRef={tableActionRef}
          breadcrumbs={breadcrumbs}
          onDataChange={refreshAll}
          testDetailFieldKeys={[].concat(SystemFieldKeys, testCaseFieldKeys)}
          onSelectionCancel={() => toggleSelection(false)}
          dataSourceGetter={dataSourceGetter}
          tableLoading={tableLoading}
          setTableLoading={setTableLoading}
          copyTestCases={copyTestCases}
          copyTestCasesV2={copyTestCasesV2}
          queryDeps={queryDeps}
          workspaceKey={workspaceKey}
          repository={repository}
          selector={selector}
        />
      </div>
    </div>
  );
};

export default React.memo(ListView);
