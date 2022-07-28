import React from 'react';
import { useDrag } from 'ahooks';
import { TestType } from '@/lib/constants';
import { deleteItems } from '@/lib/api/proxima';
import { notification, Tooltip } from 'antd';
import { UNGROUPED_FOLDER_KEY } from '../constant';
import { updateFolders } from '@/lib/api/repository';
import { UserCell } from '@projectproxima/components';
import { updateItemAssignee } from '@/lib/api/proxima';
import { useTestConfig } from '@/lib/hooks/useContext';
import { DeleteOutlined, UserOutlined, DragHandler } from '@/icons';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { deleteTestEntities, getTestEntitiesByQuery, cloneTestEntities } from '@/lib/api/common';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';

import cx from './index.less';

import RepositorySelector, {
  ActionType as RepositorySelectorActionType,
} from '@/components/business/RepositorySelector';
import RepositoryGroup from '@/components/business/RepositoryGroup';

const RowDragHandler = data => {
  const ref = React.useRef();

  useDrag(null, ref, {
    onDragStart(e) {
      const dragElem = Array.from(
        document
          .querySelector(`[data-row-key="${data.testId}"]`)
          ?.querySelectorAll('.ant-table-cell') ?? [],
      ).find(dom => dom.querySelector(`[data-element-id="row-title"]`));

      // 使用 dataTransfer 传入数据
      e.dataTransfer.setData('data', JSON.stringify(data));
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
  testDetailIds?: string[];
  onDataChange?: () => void;
  onSelectionCancel?: () => void;
  actionRef?: React.ForwardedRef<ActionType>;
};

const TestDetailTable: React.FC<TestDetailTableProps> = props => {
  const { onDataChange, actionRef, onSelectionCancel, testDetailIds, folderKey } = props;
  const tableActionRef = React.useRef<BusinessTableActionType>();
  const repositorySelectorRef = React.useRef<RepositorySelectorActionType>();
  const [tableLoading, setTableLoading] = React.useState(false);

  const [hasRowSelected, setHasRowSelected] = React.useState(false);

  const { workspace } = useTestConfig();
  const workspaceKey = workspace?.key;

  const userData = useUserCellUserDataProp(workspaceKey);

  React.useImperativeHandle(actionRef, () => tableActionRef.current);

  const dataSourceGetter = React.useCallback(
    async paginationParams => {
      if (!workspaceKey) return null;
      setTableLoading(true);
      const data = await getTestEntitiesByQuery(
        {
          workspaceKey,
          in: testDetailIds ?? [],
          type: TestType.TestDetail,
        },
        paginationParams,
      );
      setTableLoading(false);

      return {
        // 加拖拽依赖的 folderKey 数据
        list: data.results.map(item => ({ ...item, folderKey })),
        total: data.count,
      };
    },
    [workspaceKey, testDetailIds, folderKey],
  );

  const refreshAndMutateData = React.useCallback(async () => {
    setTableLoading(true);
    await onDataChange?.();
    // setTimeout(() => tableActionRef.current?.refresh());
    setTableLoading(false);
  }, [onDataChange]);

  const selectionActionNodes = React.useMemo(() => {
    const deleteTestDetail = () => {
      const testDetailIds = tableActionRef.current.selectedRowKeys;

      actionConfirm('该操作会将所选的测试用例删除，是否继续操作？', async () => {
        // 获取所选的测试用例事项 id
        setTableLoading(true);
        const { results } = await getTestEntitiesByQuery(
          {
            in: testDetailIds,
          },
          { select: ['reference'], include: [], limit: 9999 },
        );
        const itemIds = results.map(test => test.reference?.objectId);
        await Promise.all([deleteTestEntities(testDetailIds), deleteItems(itemIds)]);
        refreshAndMutateData();

        notification.success({
          message: `${tableActionRef.current.selectedRowKeys.length} 个测试用例已被删除`,
        });
        tableActionRef.current.resetSelectedRowKeys();
      });
    };

    // 更新负责人
    const toggleAssignee = async assignees => {
      setTableLoading(true);
      await updateItemAssignee(tableActionRef.current.selectedRowKeys, assignees);

      setTimeout(() => {
        refreshAndMutateData();
      }, 1000);

      notification.success({
        message: `${tableActionRef.current.selectedRowKeys.length} 个测试负责人已更新`,
      });
      setTableLoading(false);
    };

    // 复制测试用例 本期不上
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const copyTestDetail = async () => {
      const testEntityIds = tableActionRef.current.selectedRowKeys;
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
        value={[]}
        key="assignee"
        mode="multiple"
        readonly={!hasRowSelected}
        userData={userData}
        onChange={toggleAssignee}
        emptyChild={
          <span className="user-field">
            <UserOutlined /> 设置负责人
          </span>
        }
      />,
      // <span key="copy" onClick={isCheck && copyTestDetail}>
      //   <SwitcherOutlined /> 复制
      // </span>,
      <span key="delete" onClick={hasRowSelected ? deleteTestDetail : undefined}>
        <DeleteOutlined /> 删除
      </span>,
    ];
  }, [hasRowSelected, tableActionRef, userData, refreshAndMutateData, workspaceKey]);

  const columns = React.useMemo(() => {
    const deleteTestDetail = data => {
      actionConfirm('该操作会将当前测试用例删除，是否继续操作？', async () => {
        await Promise.all([
          deleteTestEntities([data.objectId]),
          deleteItems([data.reference?.objectId]),
        ]);
        refreshAndMutateData();
        notification.success({
          message: '测试用例删除成功',
        });
      });
    };

    return [
      {
        width: 40,
        key: 'move',
        fixed: true,
        isSystem: true,
        shouldCellUpdate: (record, prevRecord) =>
          record.repository?.objectId !== prevRecord.repository?.objectId,
        render(_, rowData) {
          const folderKey = rowData?.repository?.objectId ?? UNGROUPED_FOLDER_KEY;
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
        key: 'repositoryGroup',
        title: '所属模块',
        width: 200,
        render(_, rowData) {
          return <RepositoryGroup rowData={rowData}></RepositoryGroup>;
        },
      },
      {
        title: null,
        key: 'action',
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
        titleCellOption={{
          workspaceKey,
          testType: 'TestDetail',
        }}
        rowKey="objectId"
        useColumnSetting
        columns={columns}
        defaultColumnKey={['key', 'repositoryGroup', 'createdBy', 'createdAt']}
        itemKey="reference"
        name="TestDetailTable"
        loading={tableLoading}
        actionRef={tableActionRef}
        getDataSource={dataSourceGetter}
        allSelectableRowKeys={testDetailIds}
        onHasRowSelected={setHasRowSelected}
        onSelectionCancel={onSelectionCancel}
        selectionActionNodes={selectionActionNodes}
      />
      <RepositorySelector actionRef={repositorySelectorRef} />
    </>
  );
};

export default React.memo(TestDetailTable);
