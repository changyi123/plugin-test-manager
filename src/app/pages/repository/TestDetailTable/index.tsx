import React, { useCallback } from 'react';
import { useDrag, useRequest } from 'ahooks';
import { notification, Tooltip } from 'antd';
import { UNGROUPED_FOLDER_KEY } from '../constant';
import { updateFolders } from '@/lib/api/repository';
import { UserCell } from '@projectproxima/components';
import { useTestConfig } from '@/lib/hooks/useContext';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { DeleteIcon, UserIcon, DragHandler, LinkItemIcon } from '@/icons';
import { actionConfirm, generateSortIndex, openItemViewScreen } from '@/lib/utils/helper';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { cloneTestEntities } from '@/lib/api/common';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import RepositorySelector, {
  ActionType as RepositorySelectorActionType,
} from '@/components/business/RepositorySelector';
import RepositoryGroup from '@/components/business/RepositoryGroup';
import {
  copyTesTase,
  deleteTestEntity,
  getTestEntityByQuery,
  updateTestEntity,
} from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { useCurrentUser } from '@/lib/api/user';

import cx from './index.less';

const proxima = createProximaSdk();

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
  testDetailFieldKeys?: string[];
};

const TestDetailTable: React.FC<TestDetailTableProps> = props => {
  const {
    onDataChange,
    actionRef,
    onSelectionCancel,
    testDetailIds,
    folderKey,
    testDetailFieldKeys,
  } = props;
  const tableActionRef = React.useRef<BusinessTableActionType>();
  const repositorySelectorRef = React.useRef<RepositorySelectorActionType>();
  const [tableLoading, setTableLoading] = React.useState(false);
  const { workspace } = useTestConfig();
  const workspaceKey = workspace?.key;
  const { data: currentUser } = useCurrentUser();

  const [hasRowSelected, setHasRowSelected] = React.useState(false);

  const userData = useUserCellUserDataProp(workspaceKey);

  React.useImperativeHandle(actionRef, () => tableActionRef.current);

  const dataSourceGetter = React.useCallback(
    async paginationParams => {
      if (!testDetailIds?.length || !workspaceKey)
        return {
          list: [],
          total: 0,
        };
      const { list: data, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          id: testDetailIds,
        },
        fields: testDetailFieldKeys ?? [],
        ...paginationParams,
      });

      return {
        // 加拖拽依赖的 folderKey 数据
        list: data.map(item => ({ ...item, folderKey, status: item.workflowStatus })),
        total,
      };
    },
    [workspaceKey, testDetailIds, folderKey, testDetailFieldKeys],
  );

  const { data: currentFields } = useRequest(
    async () => {
      return await getCurrentUserSetting({ workspaceKey, user: currentUser });
    },
    {
      refreshDeps: [workspaceKey, currentUser],
    },
  );

  const refreshAndMutateData = React.useCallback(async () => {
    await onDataChange?.();
  }, [onDataChange]);

  const selectionActionNodes = React.useMemo(() => {
    // 批量删除用例
    const deleteTestCase = () => {
      const testDetailIds = tableActionRef.current.selectedRowKeys;

      actionConfirm('该操作会将所选的测试用例删除，是否继续操作？', async () => {
        setTableLoading(true);
        await deleteTestEntity(testDetailIds);
        refreshAndMutateData();
        setTableLoading(false);

        notification.success({
          message: `${tableActionRef.current.selectedRowKeys.length} 个测试用例已被删除`,
        });
        tableActionRef.current.resetSelectedRowKeys();
      });
    };

    // 更新负责人
    const toggleAssignee = async assignee => {
      const updateValues = tableActionRef.current.selectedRowKeys.map(d => ({
        objectId: d,
        values: {
          assignee,
        },
      }));
      setTableLoading(true);
      await updateTestEntity(updateValues);
      await refreshAndMutateData();
      notification.success({
        message: `${tableActionRef.current.selectedRowKeys.length} 个测试负责人已更新`,
      });
      setTableLoading(false);
    };

    // 批量创建事项关联
    const createItemLink = async () => {
      const testCaseIds = tableActionRef.current.selectedRowKeys;
      proxima.execute('openAddLinkScreen', testCaseIds.toString());
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
            <UserIcon className={cx('icon')} /> 设置负责人
          </span>
        }
      />,
      // <span key="copy" onClick={isCheck && copyTestDetail}>
      //   <SwitcherOutlined /> 复制
      // </span>,
      <span key="link" onClick={hasRowSelected ? createItemLink : undefined}>
        <LinkItemIcon className={cx('icon')} /> 批量事项关联
      </span>,
      <span key="delete" onClick={hasRowSelected ? deleteTestCase : undefined}>
        <DeleteIcon className={cx('icon')} /> 删除
      </span>,
    ];
  }, [hasRowSelected, tableActionRef, userData, refreshAndMutateData, workspaceKey]);

  const columns = React.useMemo(() => {
    const deleteTestDetail = data => {
      actionConfirm('该操作会将当前测试用例删除，是否继续操作？', async () => {
        setTableLoading(true);
        await deleteTestEntity([data.objectId]);
        refreshAndMutateData();
        setTableLoading(false);
        notification.success({
          message: '测试用例删除成功',
        });
      });
    };

    const copyTestDetail = async data => {
      setTableLoading(true);
      const res = await copyTesTase({
        includeStatus: false,
        name: `${data.name}_${Math.floor(Date.now())}`,
        objectId: data.objectId,
        workspace: data.workspace.objectId,
      });

      await updateTestEntity([{ objectId: res.objectId, sortIndex: generateSortIndex(1) }]);

      refreshAndMutateData();
      setTableLoading(false);

      notification.success({
        message: `测试用例复制成功`,
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
          const itemData = rowData ?? {};
          return (
            <span
              data-drawer-handle-target
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
              <a style={{ marginRight: 10 }} onClick={() => copyTestDetail(rowData)}>
                复制
              </a>
              <a style={{ marginRight: 10 }} onClick={() => deleteTestDetail(rowData)}>
                删除
              </a>
            </>
          );
        },
      },
    ];
  }, [refreshAndMutateData]);

  const handleFilterField = useCallback(
    async ({ testType, fieldKeys }) => {
      await saveUserSetting({
        workspaceKey,
        user: currentUser,
        testType,
        filterFields: {
          ...(currentFields?.filterFields ?? {}),
          [testType]: fieldKeys,
        },
      });
    },
    [currentUser, workspaceKey, currentFields],
  );

  return (
    <>
      <BusinessTable
        titleCellOption={{
          workspaceKey,
          testType: TestType.Case,
        }}
        rowKey="objectId"
        useColumnSetting
        columns={columns}
        defaultColumnKey={['key', 'repositoryGroup', 'createdBy', 'createdAt']}
        privateColumnKey={['repositoryGroup']}
        name={`${workspaceKey}_TestDetailTable`}
        loading={tableLoading}
        actionRef={tableActionRef}
        getDataSource={dataSourceGetter}
        allSelectableRowKeys={testDetailIds}
        onHasRowSelected={setHasRowSelected}
        onSelectionCancel={onSelectionCancel}
        selectionActionNodes={selectionActionNodes}
        handleFilterField={handleFilterField}
      />
      <RepositorySelector actionRef={repositorySelectorRef} />
    </>
  );
};

export default React.memo(TestDetailTable);
