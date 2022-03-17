import React from 'react';
import { useDrag } from 'ahooks';
import { TestType } from '@/lib/constants';
import { deleteItems } from '@/lib/api/proxima';
import { notification, Tooltip } from '@osui/ui';
import { updateFolders } from '@/lib/api/repository';
import { UserCell } from '@projectproxima/components';
import { updateItemAssignee } from '@/lib/api/proxima';
import { useTestConfig } from '@/lib/hooks/useContext';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DeleteOutlined, UserOutlined, SwitcherOutlined, DragHandler } from '@/icons';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { deleteTestEntities, getTestEntitiesByQuery, cloneTestEntities } from '@/lib/api/common';

import cx from './index.less';

import RepositorySelector, {
  ActionType as RepositorySelectorActionType,
} from '@/components/business/RepositorySelector';

const RowDragHandler = data => {
  const ref = React.useRef();
  useDrag(data, ref, {
    onDragStart(e) {
      const dragElem = Array.from(
        document
          .querySelector(`[data-row-key="${data.testId}"]`)
          ?.querySelectorAll('.ant-table-cell') ?? [],
      ).find(dom => dom.querySelector(`[data-element-id="row-title"]`));

      e.dataTransfer.setDragImage(dragElem, 0, 0);
    },
  });
  return (
    <Tooltip overlayClassName={cx('tooltip')} title="拖动至用例分组">
      <span ref={ref}>
        <DragHandler />
      </span>
    </Tooltip>
  );
};

export type ActionType = BusinessTableActionType;

type TestDetailTableProps = {
  folderKey?: string;
  searchValue?: string;
  testDetailIds?: string[];
  onDataChange?: () => void;
  onSelectionCancel?: () => void;
  actionRef?: React.ForwardedRef<ActionType>;
};

const TestDetailTable: React.FC<TestDetailTableProps> = props => {
  const { searchValue, testDetailIds, onDataChange, actionRef, onSelectionCancel, folderKey } =
    props;
  const tableActionRef = React.useRef<BusinessTableActionType>();
  const repositorySelectorRef = React.useRef<RepositorySelectorActionType>();
  const [tableLoading, setTableLoading] = React.useState(false);

  const [isCheck, setIsCheck] = React.useState(false);

  const { workspace } = useTestConfig();
  const workspaceKey = workspace?.key;

  React.useImperativeHandle(actionRef, () => tableActionRef.current);

  const dataSourceGetter = React.useCallback(
    async paginationParams => {
      if (!workspaceKey) return null;
      const data = await getTestEntitiesByQuery(
        {
          workspaceKey,
          nameLike: searchValue,
          in: testDetailIds ?? null,
          type: TestType.TestDetail,
        },
        {
          descendingBy: ['createdAt'],
          ...paginationParams,
        },
      );

      return {
        // 加拖拽依赖的 folderKey 数据
        list: data.results.map(item => ({ ...item, folderKey })),
        total: data.count,
      };
    },
    [searchValue, testDetailIds, workspaceKey, folderKey],
  );

  const refreshAndMutateData = React.useCallback(async () => {
    await onDataChange?.();
    setTimeout(() => tableActionRef.current?.refresh());
  }, [onDataChange]);

  const selectionActionNodes = React.useMemo(() => {
    const deleteTestDetail = () => {
      const testDetailIds = tableActionRef.current.selectedRows.map(row => row.objectId);
      const itemIds = tableActionRef.current.selectedRows
        .map(row => row.reference?.objectId)
        .filter(Boolean);

      actionConfirm('该操作会将所选的测试用例删除，是否继续操作？', async () => {
        await Promise.all([deleteTestEntities(testDetailIds), deleteItems(itemIds)]);
        refreshAndMutateData();

        notification.success({
          message: `${tableActionRef.current.selectedRows.length} 个测试用例已被删除`,
        });
      });
    };

    // 更新负责人
    const toggleAssignee = async assignees => {
      setTableLoading(true);
      const itemIds = tableActionRef.current.selectedRows
        .map(row => row.reference?.objectId)
        .filter(Boolean);
      await updateItemAssignee(itemIds, assignees);

      setTimeout(() => {
        refreshAndMutateData();
      }, 1000);

      notification.success({
        message: `${tableActionRef.current.selectedRows.length} 个测试负责人已更新`,
      });
      setTableLoading(false);
    };

    // 复制测试用例 本期不上
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copyTestDetail = async () => {
      const testEntityIds = tableActionRef.current.selectedRows.map(row => row.objectId);
      const targetRepository = await repositorySelectorRef.current.open({ workspaceKey });
      const clonedTestEntities = await cloneTestEntities(testEntityIds);
      const cloneTestEntityIds = clonedTestEntities.map(item => item.toJSON().objectId);
      await updateFolders([
        {
          key: targetRepository.repositoryKey,
          testDetailIds: targetRepository.testDetailIds.concat(cloneTestEntityIds),
        },
      ]);
      if (targetRepository.workspaceKey === workspaceKey) {
        refreshAndMutateData();
      }
    };

    return [
      <UserCell
        key="assignee"
        mode="multiple"
        readonly={!isCheck}
        onChange={toggleAssignee}
        emptyChild={
          <span>
            <UserOutlined /> 设置负责人
          </span>
        }
      />,
      // <span key="copy" onClick={isCheck && copyTestDetail}>
      //   <SwitcherOutlined /> 复制
      // </span>,
      <span key="delete" onClick={isCheck ? deleteTestDetail : undefined}>
        <DeleteOutlined /> 删除
      </span>,
    ];
  }, [refreshAndMutateData, workspaceKey, isCheck]);

  const columns = React.useMemo(() => {
    const deleteTestDetail = data => {
      actionConfirm('该操作会将当前测试用例删除，是否继续操作？', async () => {
        await Promise.all([
          deleteTestEntities([data.objectId]),
          deleteItems([data.reference?.objectId]),
        ]);
        refreshAndMutateData();
      });
    };

    return [
      {
        width: 40,
        key: `move`,
        isSystem: true,
        fixed: true,
        shouldCellUpdate: (record, prevRecord) => record.folderKey !== prevRecord.folderKey,
        render(_, rowData) {
          const folderKey = rowData.folderKey;
          return <RowDragHandler folderKey={folderKey} testId={rowData.objectId} />;
        },
      },
      {
        width: 160,
        key: 'title',
        title: '标题',
        isSystem: true,
        render(_, rowData) {
          const itemData = rowData.reference ?? {};
          return (
            <span
              data-element-id="row-title"
              style={{ cursor: 'pointer' }}
              onClick={() => openItemViewScreen(itemData.objectId)}
            >
              {itemData.name}
            </span>
          );
        },
      },
      {
        title: null,
        key: 'title',
        isSystem: true,
        fixed: 'right' as any,
        render(_, rowData) {
          return (
            <>
              <a style={{ marginRight: 10 }} onClick={() => deleteTestDetail(rowData)}>
                删除
              </a>
            </>
          );
        },
      },
    ];
  }, [refreshAndMutateData]);

  return (
    <>
      <BusinessTable
        rowKey="objectId"
        useColumnSetting
        columns={columns}
        itemKey="reference"
        name="TestDetailTable"
        actionRef={tableActionRef}
        setIsCheck={setIsCheck}
        getDataSource={dataSourceGetter}
        onSelectionCancel={onSelectionCancel}
        loading={tableLoading}
        selectionActionNodes={selectionActionNodes}
      />
      <RepositorySelector actionRef={repositorySelectorRef} />
    </>
  );
};

export default React.memo(TestDetailTable);
