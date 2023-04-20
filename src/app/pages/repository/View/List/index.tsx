import React from 'react';
import useI18n from '@/lib/hooks/useI18n';
import Table, { ActionType } from './Table';
import { reverseTreeNodes } from '../../util';
import RepoDropDown from '../../RepoDropDown';
import { ViewComponentProps } from '../type';
import { Button, notification, Select } from 'antd';
import { useRequest, useUpdateEffect } from 'ahooks';
import { logPluginVersion } from '@/lib/utils/helper';
import { UNGROUPED_FOLDER_KEY } from '../../constant';
import { getTestEntityByQuery, getTestStats } from '@/lib/api/item';
import { getRepositoryQuery } from '@/lib/utils/tree';
import { useTestConfig } from '@/lib/hooks/useContext';
import { useBaseAction } from '@/lib/hooks/useContext';
import FilterSearch from '@/components/common/FilterSearch';
import { useListener } from '@projectproxima/proxima-sdk-js';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { getExtendFields, RepositoryModel, TestType } from '@/lib/constants';
import {
  SystemFieldKeys,
  // useTestTypeScreenFieldKeys,
} from '@/components/common/BusinessTable/hook';

import cx from './index.less';

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
  const { workspace } = useTestConfig();
  const { createItemUseModal, getCreatePermission, testCaseFieldKeys } = useBaseAction();
  const [selector, setSelector] = React.useState(null);
  const [breadcrumbs, setBreadcrumbs] = React.useState([]);
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);
  const [groupedMode, setGroupedMode] = React.useState<GroupedMode>('all');
  const [tableLoading, setTableLoading] = React.useState(false);

  const workspaceKey = workspace?.key;
  const selectNodeKey = selectedNode?.key;

  // 事项数据更新后刷新列表
  useListener('updateItemList', props => {
    if (props?.type === 'create') return;
    if (props?.type === 'delete') {
      refreshAll();
    }
    setTimeout(() => {
      tableActionRef.current.refresh();
    }, 400);
  });

  // 获取当前筛选条件下全部用例 ID
  const { data: allTestCaseIds, refreshAsync: refreshTable } = useRequest(
    async () => {
      if (!workspaceKey) return [];
      const repository = getRepositoryQuery(selectedNode, groupedMode);
      const { list: caseIds } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          ...repository,
        },
        limit: 99999,
        selector,
        onlySelectId: true,
      });

      return caseIds;
    },
    {
      manual: true,
    },
  );

  const dataSourceGetter = React.useCallback(
    async params => {
      if (!selectedNode?.key || !workspaceKey || !testCaseFieldKeys?.length)
        return {
          list: [],
          total: 0,
        };
      setTableLoading(true);
      const repository = getRepositoryQuery(selectedNode, groupedMode);
      const { list: data, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          ...repository,
        },
        selector,
        fields: [].concat(SystemFieldKeys, testCaseFieldKeys),
        ...params,
      });

      const quoteCounts = await getTestStats({
        groups: 'referenceCase',
        params: {
          query: {
            workspaceKey: workspaceKey,
            type: TestType.Run,
          },
          limit: 99999,
        } as any,
      });

      const quoteCountMap = new Map();
      quoteCounts.forEach(c => {
        quoteCountMap.set(c.referenceCase, c.count);
      });
      setTableLoading(false);

      return {
        // 加拖拽依赖的 folderKey 数据
        list: data.map(item => ({
          ...item,
          folderKey: selectedNode?.key,
          status: item.workflowStatus,
          quoteCount: quoteCountMap.get(item.id) ?? 0,
        })),
        total,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedNode, workspaceKey, groupedMode, selector, testCaseFieldKeys.toString()],
  );

  useUpdateEffect(() => {
    // 重置全部事项 ID
    if (workspaceKey && selectedNode) {
      refreshTable();
    }
  }, [workspaceKey, refreshTable, selectedNode, groupedMode]);

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
    await Promise.all([onFolderTreeChange(), tableActionRef.current.refresh(), refreshTable()]);
  }, [onFolderTreeChange, refreshTable]);

  // 处理筛选器搜索
  const handleSelectorSearch = async selector => {
    setSelector(selector);
    // 添加筛选项目需要重置批量选中的 row
    tableActionRef.current.resetSelectedRowKeys();
    await refreshTable();
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
          <Button
            type="primary"
            disabled={getCreatePermission(TestType.Case)}
            onClick={createTestDetail}
            className={cx('action')}
          >
            {t('common.addTestCase')}
          </Button>
          <RepoDropDown
            type="repository"
            treeNodeData={folderTreeData}
            folderKey={selectNodeKey}
            filteredCaseIds={allTestCaseIds}
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
          testDetailIds={allTestCaseIds}
          onDataChange={refreshAll}
          testDetailFieldKeys={[].concat(SystemFieldKeys, testCaseFieldKeys)}
          onSelectionCancel={() => toggleSelection(false)}
          dataSourceGetter={dataSourceGetter}
          tableLoading={tableLoading}
          setTableLoading={setTableLoading}
        />
      </div>
    </div>
  );
};

export default React.memo(ListView);
