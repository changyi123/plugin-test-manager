import { UserCell } from '@giteeteam/apps-team-components';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useDrag, useDrop, useRequest } from 'ahooks';
import { message, notification, Space, Tooltip } from 'antd';
import React, { useCallback } from 'react';

import RenderRepository from '@/components/business/RenderRepository';
import RepositorySelector, {
  ActionType as RepositorySelectorActionType,
} from '@/components/business/RepositorySelector';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { DeleteIcon, DragHandler, LinkItemIcon, SwitcherOutlined, UserIcon } from '@/icons';
import { deleteTestEntity, updateTestEntity } from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import { useGetWorkspaceRepository } from '@/lib/hooks/useTest';
import fetch from '@/lib/utils/fetch';
import { actionConfirm, getPluginWebTriggerBaseUrl, openItemViewScreen } from '@/lib/utils/helper';

import { UNGROUPED_FOLDER_KEY } from '../../constant';
import cx from './Table.less';

const proxima = createProximaSdk();

const RowDragBox = ({ children, ...data }) => {
  const ref = React.useRef();

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
  return <span ref={ref}>{children}</span>;
};

export type ActionType = BusinessTableActionType;

type TestDetailTableProps = {
  externalDataLoading?: boolean;
  testDetailIds?: string[];
  onDataChange?: () => void;
  onSelectionCancel?: () => void;
  actionRef?: React.ForwardedRef<ActionType>;
  testDetailFieldKeys?: string[];
  dataSourceGetter?: any;
  tableLoading?: boolean;
  setTableLoading?: (val?: boolean) => void;
  copyTestCases?: (val: string[]) => any;
};

const TestDetailTable: React.FC<TestDetailTableProps> = props => {
  const {
    onDataChange,
    actionRef,
    onSelectionCancel,
    externalDataLoading: externalDataLoadingProp,
    testDetailIds,
    dataSourceGetter,
    setTableLoading,
    tableLoading,
    copyTestCases,
  } = props;
  const { t } = useI18n();
  const externalDataLoading =
    typeof externalDataLoadingProp === 'boolean' ? externalDataLoadingProp : false;

  const tableActionRef = React.useRef<BusinessTableActionType>();
  const repositorySelectorRef = React.useRef<RepositorySelectorActionType>();
  const { workspace } = useTestConfig();
  const workspaceKey = workspace?.key;
  // 缓存用例库数据，用于监听用例库修改后刷新表格所属模块
  useGetWorkspaceRepository(workspaceKey);
  const { data: currentUser } = useCurrentUser();
  const [hasRowSelected, setHasRowSelected] = React.useState(false);
  const userData = useUserCellUserDataProp(workspaceKey);

  React.useImperativeHandle(actionRef, () => tableActionRef.current);

  // useListener('updateItemExtraCustomerFields', async itemId => {
  //   // 复制用例事项更新自定义字段
  //   if (itemId) {
  //     const updateRes = await updateTestEntity([
  //       {
  //         objectId: itemId,
  //         sortIndex: generateSortIndex(1),
  //         caseStatues: {},
  //         linkType: null,
  //         linkItems: null,
  //       },
  //     ]);
  //     if (updateRes?.status === 'error') {
  //       message.error(updateRes.data);
  //       return;
  //     }
  //     // 刷新全部
  //     onDataChange?.();
  //   }
  // });

  const { data: currentFields } = useRequest(
    async () => {
      return await getCurrentUserSetting({ workspaceKey, user: currentUser });
    },
    {
      refreshDeps: [workspaceKey, currentUser],
    },
  );

  const selectionActionNodes = React.useMemo(() => {
    // 批量删除用例
    const deleteTestCase = () => {
      const testDetailIds = tableActionRef.current.selectedRowKeys;

      actionConfirm(
        {
          title: t('common.tip'),
          okText: t('common.okText'),
          cancelText: t('common.cancel'),
          content: t('page.repository.view.list.actionConfirm.0'),
        },
        async () => {
          setTableLoading(true);
          const res = await deleteTestEntity(testDetailIds);
          if (res?.status === 'error') {
            setTableLoading(false);
            message.error(res.data);
            return;
          }
          // 删除刷新
          onDataChange?.();
          setTableLoading(false);

          notification.success({
            message: t('page.repository.view.list.deleteCaseSuccess', {
              count: tableActionRef.current.selectedRowKeys.length,
            }),
          });
          tableActionRef.current.resetSelectedRowKeys();
        },
      );
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
      // 刷新表格
      tableActionRef.current.refresh();
      notification.success({
        message: `${tableActionRef.current.selectedRowKeys.length} ${t(
          'page.plan.testEntityList.updateAssigneeTips',
        )}`,
      });
      setTableLoading(false);
    };

    // 批量创建事项关联
    const createItemLink = async () => {
      const testCaseIds = tableActionRef.current.selectedRowKeys;
      proxima.execute('openAddLinkScreen', testCaseIds.toString());
    };

    // 批量复制用例
    const copyTestDetail = async () => {
      const testCaseIds = tableActionRef.current.selectedRowKeys;
      setTableLoading(true);
      const res = await copyTestCases(testCaseIds);
      if (res?.status === 'error') {
        setTableLoading(false);
        return message.error(res.message);
      }

      // 复制刷新
      onDataChange?.();
      setTableLoading(false);

      notification.success({
        message: t('page.repository.view.list.copyCaseMessageSuccess'),
      });
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
          <span className={cx('user-field')}>
            <UserIcon className={cx('icon')} /> {t('page.plan.testEntityList.assigneeSetting')}
          </span>
        }
      />,
      <span key="copy" onClick={hasRowSelected && copyTestDetail}>
        <SwitcherOutlined /> 复制
      </span>,
      <span key="link" onClick={hasRowSelected ? createItemLink : undefined}>
        <LinkItemIcon className={cx('icon')} /> {t('page.repository.view.list.batchItemLink')}
      </span>,
      <span key="delete" onClick={hasRowSelected ? deleteTestCase : undefined}>
        <DeleteIcon className={cx('icon')} /> {t('common.delete')}
      </span>,
    ];
  }, [hasRowSelected, userData, t, setTableLoading, onDataChange, copyTestCases]);

  const columns = React.useMemo(() => {
    const deleteTestDetail = data => {
      actionConfirm(
        {
          title: t('common.tip'),
          okText: t('common.okText'),
          cancelText: t('common.cancel'),
          content: t('page.repository.view.list.actionConfirm.1'),
        },
        async () => {
          setTableLoading(true);
          const res = await deleteTestEntity([data.objectId]);
          if (res?.status === 'error') {
            setTableLoading(false);
            message.error(res.data);
            return;
          }
          // 删除刷新
          setTimeout(() => {
            onDataChange?.();
          }, 500);
          setTableLoading(false);
          notification.success({
            message: t('page.repository.view.list.deleteCaseMessageSuccess'),
          });
        },
      );
    };

    const copyTestDetail = async data => {
      setTableLoading(true);
      const res = await copyTestCases([data.objectId]);
      if (res?.status === 'error') {
        setTableLoading(false);
        return message.error(res.message);
      }

      // 复制刷新
      onDataChange?.();
      setTableLoading(false);

      notification.success({
        message: t('page.repository.view.list.copyCaseMessageSuccess'),
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
              <Tooltip
                overlayClassName={cx('tooltip')}
                title={t('page.repository.view.list.dropCaseToGroup')}
              >
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
        title: t('common.title'),
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
            record.sortIndex !== prevRecord.sortIndex ||
            record.name !== prevRecord.name
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
        key: 'quoteCount',
        title: t('page.plan.testEntityList.quoteCount'),
        width: 200,
        render(_, rowData) {
          return <span>{rowData.quoteCount}</span>;
        },
      },
      {
        key: 'repositoryGroup',
        title: t('page.plan.testEntityList.repositoryGroup'),
        width: 200,
        render(_, rowData) {
          return <RenderRepository repository={rowData?.repository} />;
        },
      },
      {
        key: 'action',
        title: t('common.action'),
        isSystem: true,
        fixed: 'right' as any,
        width: 100,
        render(_, rowData) {
          return (
            <Space>
              <a onClick={() => copyTestDetail(rowData)}>{t('common.copy')}</a>
              <a onClick={() => deleteTestDetail(rowData)}>{t('common.delete')}</a>
            </Space>
          );
        },
      },
    ];
  }, [copyTestCases, onDataChange, setTableLoading, t]);

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

          tableActionRef.current.refresh();
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
        className={cx('test-table-box')}
        useColumnSetting
        columns={columns}
        bodyRowComponent={DropRow}
        defaultColumnKey={['key', 'repositoryGroup', 'quoteCount', 'createdBy', 'createdAt']}
        privateColumnKey={['repositoryGroup', 'quoteCount']}
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
