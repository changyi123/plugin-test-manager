import React, { useCallback } from 'react';
import { useRequest, useDrag, useDrop } from 'ahooks';
import { message, notification, Tooltip } from 'antd';
import { UNGROUPED_FOLDER_KEY } from '../../constant';
import { updateFolders } from '@/lib/api/repository';
import { UserCell } from '@projectproxima/components';
import { useTestConfig } from '@/lib/hooks/useContext';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { DeleteIcon, UserIcon, DragHandler, LinkItemIcon } from '@/icons';
import {
  actionConfirm,
  generateSortIndex,
  getPluginWebTriggerBaseUrl,
  openItemViewScreen,
} from '@/lib/utils/helper';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { cloneTestEntities } from '@/lib/api/common';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import RepositorySelector, {
  ActionType as RepositorySelectorActionType,
} from '@/components/business/RepositorySelector';
import RepositoryGroup from '@/components/business/RepositoryGroup';
import {
  copyTesCase,
  deleteTestEntity,
  getTestEntityByQuery,
  updateTestEntity,
} from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { useCurrentUser } from '@/lib/api/user';
import fetch from '@/lib/utils/fetch';

import cx from './Table.less';

const proxima = createProximaSdk();

const RowDragBox = ({ children, ...data }) => {
  const ref = React.useRef();
  // const [dragging, setDragging] = React.useState(false);

  useDrag(null, ref, {
    onDragStart(e) {
      // setDragging(true);
      const dragElem = Array.from(
        document
          .querySelector(`[data-row-key="${data.testId}"]`)
          ?.querySelectorAll('.ant-table-cell') ?? [],
      ).find(dom => dom.querySelector(`[data-element-id="row-title"]`));

      // onDropEnter 无法接收到 data
      global.dragNode = data;
      // 使用 dataTransfer 传入数据
      e.dataTransfer.setData('data', JSON.stringify(data));
      e.dataTransfer?.setDragImage(dragElem, 0, 0);
    },
    onDragEnd() {
      // setDragging(false);
    },
  } as any);
  // className={cx(dragging ? 'dragging' : '', 'test-case-drag')}
  return <span ref={ref}>{children}</span>;
};

export type ActionType = BusinessTableActionType;

type TestDetailTableProps = {
  folderKey?: string;
  externalDataLoading?: boolean;
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
    externalDataLoading: externalDataLoadingProp,
    testDetailFieldKeys,
  } = props;

  const externalDataLoading =
    typeof externalDataLoadingProp === 'boolean' ? externalDataLoadingProp : false;

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
        const res = await deleteTestEntity(testDetailIds);
        if (res?.status === 'error') {
          setTableLoading(false);
          message.error(res.data);
          return;
        }
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
      const res = await updateTestEntity(updateValues);
      if (res?.status === 'error') {
        setTableLoading(false);
        message.error(res.data);
        return;
      }
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
        const res = await deleteTestEntity([data.objectId]);
        if (res?.status === 'error') {
          setTableLoading(false);
          message.error(res.data);
          return;
        }
        refreshAndMutateData();
        setTableLoading(false);
        notification.success({
          message: '测试用例删除成功',
        });
      });
    };

    const copyTestDetail = async data => {
      setTableLoading(true);
      const res = await copyTesCase({
        includeStatus: false,
        name: `${data.name}_${Math.floor(Date.now())}`,
        objectId: data.objectId,
        workspace: data.workspace.objectId,
      });
      if (res?.status === 400) {
        setTableLoading(false);
        return;
      }

      const updateRes = await updateTestEntity([
        { objectId: res.objectId, sortIndex: generateSortIndex(1) },
      ]);
      if (updateRes?.status === 'error') {
        setTableLoading(false);
        message.error(updateRes.data);
        return;
      }

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
        shouldCellUpdate: (record, prevRecord) => {
          return (
            record.repository?.objectId !== prevRecord.repository?.objectId ||
            record.sortIndex !== prevRecord.sortIndex
          );
        },
        render(_, rowData) {
          const folderKey = rowData?.repository ?? UNGROUPED_FOLDER_KEY;
          return (
            <RowDragBox
              folderKey={folderKey}
              testId={rowData.objectId}
              sortIndex={rowData.sortIndex}
              rowData={rowData}
            >
              <Tooltip overlayClassName={cx('tooltip')} title="拖动至用例分组">
                <span>
                  <DragHandler />
                </span>
              </Tooltip>
            </RowDragBox>
          );
        },
      },
      {
        width: 300,
        key: 'title',
        title: '标题',
        isSystem: true,
        className: 'test-case-title',
        extraProps: {
          onClick: record => {
            openItemViewScreen(record?.objectId);
          },
        },
        shouldCellUpdate: (record, prevRecord) => {
          return (
            record.repository?.objectId !== prevRecord.repository?.objectId ||
            record.sortIndex !== prevRecord.sortIndex
          );
        },
        render(_, rowData) {
          const folderKey = rowData?.repository ?? UNGROUPED_FOLDER_KEY;
          return (
            <RowDragBox
              folderKey={folderKey}
              testId={rowData.objectId}
              sortIndex={rowData.sortIndex}
              rowData={rowData}
            >
              <span
                data-drawer-handle-target
                data-element-id="row-title"
                style={{ cursor: 'pointer' }}
              >
                {rowData?.name}
              </span>
            </RowDragBox>
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

  const handleDragoverClassName = useCallback((e, node, sortIndex, type) => {
    const getDropClassName = () => {
      return cx(
        `${
          sortIndex < node?.sortIndex
            ? 'test-manager-drop-over-downward'
            : 'test-manager-drop-over-upward'
        }`,
      );
    };

    const dragoverClassName = getDropClassName();
    const rowNode = (e.target as any).closest('.ant-table-row');
    if (type === 'add') {
      rowNode.classList.add(dragoverClassName);
    } else {
      rowNode.classList.remove(dragoverClassName);
    }
  }, []);

  const DropRow = ({ rowData, ...restProps }) => {
    const ref = React.useRef(null);
    useDrop(ref, {
      onDom: async (_, e) => {
        // rowData 接受节点
        const data = JSON.parse(e.dataTransfer.getData('data'));
        if (!data?.rowData?.sortIndex) return;
        if (data.rowData.sortIndex === rowData.sortIndex) return;
        const params = [
          {
            source: {
              id: data.rowData.id,
              name: data.rowData.name,
              sortIndex: data.rowData.sortIndex,
            },
            target: {
              id: rowData.id,
              name: rowData.name,
              sortIndex: rowData.sortIndex,
            },
          },
        ];

        // 请求脚本 generate-sortIndex 获取 sortIndex
        const { sortIndex } = await fetch.$post(
          `${getPluginWebTriggerBaseUrl()}/generate-sortIndex`,
          {
            list: params,
            workspaceKey,
          },
        );

        if (sortIndex) {
          const res = await updateTestEntity([
            {
              objectId: data.rowData.id,
              sortIndex,
            },
          ]);
          if (res?.status === 'error') {
            message.error(res.data);
            return;
          }

          await onDataChange();
        }

        handleDragoverClassName(e, data, rowData.sortIndex, 'remove');
      },
      onDragEnter(e) {
        if (!global.dragNode?.sortIndex) return;
        if (global.dragNode?.sortIndex === rowData?.sortIndex) return;
        handleDragoverClassName(e, global.dragNode, rowData.sortIndex, 'add');
      },
      onDragLeave(e) {
        if (!global.dragNode?.sortIndex) return;
        if (global.dragNode?.sortIndex === rowData?.sortIndex) return;
        handleDragoverClassName(e, global.dragNode, rowData.sortIndex, 'remove');
      },
    });
    return <tr ref={ref} {...restProps} />;
  };

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
        bodyRowComponent={DropRow}
        defaultColumnKey={['key', 'repositoryGroup', 'createdBy', 'createdAt']}
        privateColumnKey={['repositoryGroup']}
        name={`${workspaceKey}_TestDetailTable`}
        actionRef={tableActionRef}
        getDataSource={dataSourceGetter}
        allSelectableRowKeys={testDetailIds}
        onHasRowSelected={setHasRowSelected}
        onSelectionCancel={onSelectionCancel}
        loading={externalDataLoading || tableLoading}
        selectionActionNodes={selectionActionNodes}
        handleFilterField={handleFilterField}
      />
      <RepositorySelector actionRef={repositorySelectorRef} />
    </>
  );
};

export default React.memo(TestDetailTable);
