import React from 'react';
import { Button, notification, Select } from 'antd';
import { logPluginVersion } from '@/lib/utils/helper';
import { useBaseAction } from '@/lib/hooks/useContext';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { useRequest } from 'ahooks';
import Table, { ActionType } from './Table';
import { extendFields, RepositoryModel, TestType } from '@/lib/constants';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { reverseTreeNodes, getTreeNodeByKey, traverseTreeNodes } from '../../util';

import { UNGROUPED_FOLDER_KEY } from '../../constant';
import RepoDropDown from '../../RepoDropDown';
import FilterSearch from '@/components/common/FilterSearch';
import { getTestEntityByQuery } from '@/lib/api/item';
import { useTestTypeScreenFieldKeys } from '@/components/common/BusinessTable/hook';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';

import { ViewComponentProps } from '../type';

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
  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const [selector, setSelector] = React.useState(null);
  const [breadcrumbs, setBreadcrumbs] = React.useState([]);
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);
  const [groupedMode, setGroupedMode] = React.useState<GroupedMode>('all');

  const workspaceKey = workspace?.key;
  const selectNodeKey = selectedNode?.key;

  const testDetailFieldKeys = useTestTypeScreenFieldKeys({
    testType: TestType.Case,
    workspaceKey,
  });
  // 事项数据更新后刷新列表
  useListener('updateItemList', props => {
    if (props?.type === 'create') return;
    setTimeout(() => {
      handleDataChange();
    }, 400);
  });

  useListener('closeItemViewScreen', () => {
    setTimeout(() => {
      handleDataChange();
    }, 400);
  });

  const {
    loading: caseIdRequestLoading,
    data: filteredCaseIds,
    runAsync: getTestCaseIds,
  } = useRequest(
    async (newNode?: Record<string, any>) => {
      if (!workspaceKey || !selectedNode) return [];

      let scopedTestCaseIds = [];
      // 包含子分组的所有用例
      if (groupedMode === 'all') {
        traverseTreeNodes([newNode ?? selectedNode], node => {
          scopedTestCaseIds = scopedTestCaseIds.concat(node.caseIds);
        });
      } else {
        scopedTestCaseIds = (newNode ?? selectedNode).caseIds;
      }

      const { list: caseIds } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          id: scopedTestCaseIds,
        },
        selector,
        offset: 0,
        limit: 99999,
        onlySelectId: true,
      });

      return caseIds;
    },
    {
      manual: true,
    },
  );

  React.useEffect(() => {
    getTestCaseIds();
  }, [getTestCaseIds, workspaceKey, groupedMode, selectedNode]);

  React.useEffect(() => {
    const breadcrumbs = [];
    reverseTreeNodes(folderTreeData, selectedNode, node => {
      breadcrumbs.unshift(node.name ?? node.title);
    });
    setBreadcrumbs(breadcrumbs);
  }, [setBreadcrumbs, selectedNode, folderTreeData]);

  React.useEffect(() => {
    tableActionRef.current.resetSelectedRowKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedMode]);

  const handleDataChange = React.useCallback(async () => {
    const treeData = await onFolderTreeChange();
    const selectedFolder = getTreeNodeByKey(treeData, selectNodeKey);
    if (selectedFolder) {
      getTestCaseIds(selectedFolder);
    }
  }, [onFolderTreeChange, getTestCaseIds, selectNodeKey]);

  // 处理筛选器搜索
  const handleSelectorSearch = async selector => {
    setSelector(selector);
    // 添加筛选项目需要重置批量选中的 row
    tableActionRef.current.resetSelectedRowKeys();
    await getTestCaseIds();
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
    await handleDataChange();
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
          <RepoDropDown type="repository" treeNodeData={folderTreeData} folderKey={selectNodeKey} />
        </div>
      </div>
      <div className={cx('table-container')} style={{ height: 'calc(100% - 105px)' }}>
        <FilterSearch
          className={cx('filter-search-box')}
          onSearch={handleSelectorSearch}
          fields={getFilterFields(testDetailFieldKeys)}
          extendFields={extendFields.filter(field => field.key === RepositoryModel)}
          testType={TestType.Case}
        />
        <Table
          folderKey={selectNodeKey}
          actionRef={tableActionRef}
          onDataChange={handleDataChange}
          testDetailIds={filteredCaseIds}
          externalDataLoading={caseIdRequestLoading}
          testDetailFieldKeys={testDetailFieldKeys}
          onSelectionCancel={() => toggleSelection(false)}
        />
      </div>
    </div>
  );
};

export default React.memo(ListView);
