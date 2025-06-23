import { useSDK } from '@projectproxima/plugin-sdk';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { useDrag, useDrop, useMemoizedFn, useRequest } from 'ahooks';
import { message, notification, Space, Tooltip } from 'antd';
import { batchQueryToIql } from 'common/utils/helper';
import { Operator } from 'common/utils/iqlBuilder';
import { pick } from 'lodash-es';
import React, { useCallback } from 'react';

import {
  deleteV2WithProcess,
  updateItemsWithProcess,
} from '@/components/business/BatchResult/hooks';
import RenderRepository from '@/components/business/RenderRepository';
import RepositorySelector, {
  ActionType as RepositorySelectorActionType,
} from '@/components/business/RepositorySelector';
import UserCell from '@/components/business/UserCell';
import type { BusinessTableActionType } from '@/components/common/BusinessTable/type';
import { BusinessTable } from '@/components/dynamicComponents';
import {
  DeleteIcon,
  DragHandler,
  EditIcon,
  LinkItemIcon,
  SwitcherOutlined,
  UserIcon,
} from '@/icons';
import {
  deleteTestEntity,
  getTestEntityByQuery,
  handleSelector,
  updateTestEntity,
} from '@/lib/api/item';
import { useCurrentUser } from '@/lib/api/user';
import { getCurrentUserSetting, saveUserSetting } from '@/lib/api/userSetting';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import fetch from '@/lib/utils/fetch';
import { getProximaBasePath, getTenantKey } from '@/lib/utils/helper';
import { actionConfirm, getPluginWebTriggerBaseUrl, openItemViewScreen } from '@/lib/utils/helper';
import { SearchSelectors, selectorToIql } from '@/lib/utils/iql';

import { UNGROUPED_FOLDER_KEY } from '../../constant';
import CopyButton from '../Copy/Button';
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

const DropRow = ({ rowData, ...restProps }) => {
  const ref = React.useRef(null);
  const { context } = useSDK();

  const handleDragoverClassName = useMemoizedFn((e, node, sortIndex, type) => {
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
  });

  useDrop(ref, {
    onDom: async (_, e) => {
      // rowData 接受节点
      console.info('DropRow', e);
      const data = JSON.parse(e.dataTransfer.getData('data'));
      handleDragoverClassName(e, data, rowData.sortIndex, 'remove');
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
          workspaceKey: context?.env?.WORKSPACE_KEY,
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

        await proxima.execute('updateItemList');
      }
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

  const trProps = pick(restProps, [
    'rowData',
    'onClick',
    'className',
    'style',
    'children',
    'data-row-key', // 拖拽测试用例需要
  ]);
  return <tr ref={ref} {...trProps} />;
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
  queryDeps: string;
  workspaceKey: string;
  breadcrumbs?: string[];
  repository?: Record<string, any>;
  selector?: SearchSelectors | string;
};

const TestDetailTable: React.FC<TestDetailTableProps> = props => {
  const {
    onDataChange,
    actionRef,
    onSelectionCancel,
    externalDataLoading: externalDataLoadingProp,
    dataSourceGetter,
    setTableLoading,
    tableLoading,
    queryDeps,
    workspaceKey,
    repository,
    selector,
    breadcrumbs,
  } = props;
  const { t } = useI18n();
  const externalDataLoading =
    typeof externalDataLoadingProp === 'boolean' ? externalDataLoadingProp : false;

  const tableActionRef = React.useRef<BusinessTableActionType>();
  const repositorySelectorRef = React.useRef<RepositorySelectorActionType>();
  // // 缓存用例库数据，用于监听用例库修改后刷新表格所属模块
  // useGetWorkspaceRepository(workspaceKey);
  const { data: currentUser } = useCurrentUser();
  const [hasRowSelected, setHasRowSelected] = React.useState(false);

  const { workspace } = useTestConfig();

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
      return await getCurrentUserSetting({
        workspaceKey,
        user: currentUser as unknown as Parse.Pointer,
      });
    },
    {
      refreshDeps: [workspaceKey, currentUser],
    },
  );

  const getBatchParams = useCallback(
    params => {
      const batchParams = {
        query: {
          workspaceKey,
          id: null,
          type: TestType.Case,
          ...repository,
        },
        selector: typeof selector === 'string' ? selector : selectorToIql(handleSelector(selector)),
        notNeedQuery: false,
        selectedRowKeys: [],
        selectAll: params?.selectAll,
        breadcrumbs,
      };
      if (!params) return;
      const { selectedRowKeys = [], unSelectedRowKeys = [], selectAll, total } = params;
      if (!selectAll || (selectAll && selectedRowKeys?.length >= total)) {
        batchParams.query.id = {
          operator: Operator.In,
          value: selectedRowKeys,
        } as unknown as any;
      } else {
        batchParams.query.id = {
          operator: Operator.NotIn,
          value: unSelectedRowKeys,
        } as unknown as any;
      }
      return batchParams;
    },
    [repository, selector, workspaceKey, breadcrumbs],
  );

  const getSelectTestCaseId = useCallback(
    async (params, isDetail?: boolean) => {
      const batchParams = getBatchParams(params);
      if (!batchParams) return;
      if (batchParams.notNeedQuery) return batchParams.selectedRowKeys;
      let caseIds = [];
      let total = 0;
      do {
        const res = await getTestEntityByQuery({
          ...batchParams,
          ascending: ['sortIndex', 'createdAt'],
          offset: caseIds.length,
          limit: 9999,
          select: ['id', 'key'],
        });
        caseIds = caseIds.concat(res.list);
        total = res.total;
      } while (caseIds.length < total);
      if (isDetail) {
        return caseIds;
      } else {
        return caseIds?.map(({ id }) => id);
      }
    },
    [getBatchParams],
  );

  const selectionActionNodes = React.useMemo(() => {
    // 批量删除用例
    const deleteTestCase = () => {
      const table = tableActionRef.current;
      const deletedCount = table.selectAll
        ? table.total - table.unSelectedRowKeys.length
        : table.selectedRowKeys.length;

      const deleteContent = t('page.repository.view.list.multipleDeleteCase', {
        count: deletedCount,
      });
      const highlightCountContent = deleteContent.replace(
        deletedCount,
        `<span style="color: #ff4d0d">${deletedCount}</span>`,
      );

      actionConfirm(
        {
          title: t('common.tip'),
          okText: t('common.okText'),
          cancelText: t('common.cancel'),
          content: <div dangerouslySetInnerHTML={{ __html: highlightCountContent }} />,
        },
        async () => {
          setTableLoading(true);
          const batchParams = getBatchParams(tableActionRef.current);
          if (!batchParams) return;
          await deleteV2WithProcess({
            queryParams: batchParams,
            handleSuccess: () => {
              onDataChange?.();
              setTableLoading(false);

              notification.success({
                message: t('page.repository.view.list.deleteCaseSuccess', {
                  count: deletedCount,
                }),
              });
              table.resetSelectedRowKeys();
            },
            handleFail: error => {
              setTableLoading(false);
              message.error(error.message);
            },
          });
        },
      );
    };

    // 更新负责人
    const toggleAssignee = async assignee => {
      setTableLoading(true);
      const batchParams = getBatchParams(tableActionRef.current);
      if (!batchParams) return;
      await updateItemsWithProcess({
        queryParams: batchParams,
        fields: {
          values: {
            assignee,
          },
        },
        handleSuccess: () => {
          const table = tableActionRef.current;
          const changedCount = table.selectAll
            ? table.total - table.unSelectedRowKeys.length
            : table.selectedRowKeys.length;
          table.refresh();

          notification.success({
            message: `${changedCount} ${t('page.plan.testEntityList.updateAssigneeTips')}`,
          });
          setTableLoading(false);
        },
        handleFail: error => {
          setTableLoading(false);
          message.error(error.message);
        },
      });
    };

    // 批量创建事项关联
    const createItemLink = async () => {
      console.info(batchQueryToIql(getBatchParams(tableActionRef.current).query), 'getBatchParams');
      proxima.execute('openAddLinkScreen', {
        iql: batchQueryToIql(getBatchParams(tableActionRef.current).query),
        breadcrumbs,
        selectAll: tableActionRef.current.selectAll,
        displayContext: 'test_manager',
        context: {
          displayContext: 'test_manager',
        },
      });
    };

    const openBatchPage = async () => {
      const localIqlKey = `batch_quick_edit_test_manager`;
      const extendsCustomKey = ['r_test_manager_repository'];
      // 组装批量操作地址
      const testBoard = await new Parse.Query('Board')
        .equalTo('pluginKey', 'test_manager_test-repository')
        .equalTo('workspace', workspace?.objectId)
        .first();
      window.localStorage.setItem(
        localIqlKey,
        batchQueryToIql(getBatchParams(tableActionRef.current).query),
      );
      // 构造url，打开批量编辑页面
      const itemBatchPage = `${getProximaBasePath()}/${getTenantKey()}/workspaces/${workspaceKey}/batch-operate/${testBoard.get(
        'key',
      )}?localIql=${localIqlKey}&displayContext=test_manager&operate=quick_edit&extendsCustomKey=${encodeURIComponent(
        JSON.stringify(extendsCustomKey),
      )}`;
      window.open(itemBatchPage, '_blank');
      tableActionRef.current.refresh();
    };

    return [
      <span
        className={cx('action')}
        key="link"
        onClick={hasRowSelected ? openBatchPage : undefined}
      >
        <EditIcon />
        {t('page.plan.testEntityList.batchEdit')}
      </span>,
      <UserCell
        value={[]}
        key="assignee"
        mode="multiple"
        readonly={!hasRowSelected}
        onChange={toggleAssignee}
        emptyChild={
          <span className={cx('action', 'user-field')}>
            <UserIcon className={cx('icon')} /> {t('page.plan.testEntityList.assigneeSetting')}
          </span>
        }
      />,
      <CopyButton
        key="copyAction"
        disabled={!hasRowSelected}
        getQueryParams={() => getBatchParams(tableActionRef.current)}
        onStart={() => setTableLoading(true)}
        onFinished={() => {
          onDataChange?.();
          setTableLoading(false);
        }}
      >
        <span className={cx('action', 'copy')}>
          <SwitcherOutlined /> {t('common.copy')}
        </span>
      </CopyButton>,
      <span
        className={cx('action')}
        key="link"
        onClick={hasRowSelected ? createItemLink : undefined}
      >
        <LinkItemIcon className={cx('icon')} /> {t('page.repository.view.list.batchItemLink')}
      </span>,
      <span
        className={cx('action', 'delete')}
        key="delete"
        onClick={hasRowSelected ? deleteTestCase : undefined}
      >
        <DeleteIcon className={cx('icon')} /> {t('common.delete')}
      </span>,
    ];
  }, [
    hasRowSelected,
    t,
    setTableLoading,
    getBatchParams,
    onDataChange,
    getSelectTestCaseId,
    workspace?.objectId,
    workspaceKey,
  ]);

  const columns = React.useMemo(() => {
    const deleteTestDetail = data => {
      actionConfirm(
        {
          title: t('common.tip'),
          okText: t('common.okText'),
          cancelText: t('common.cancel'),
          content: t('page.repository.view.list.deleteCase'),
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

    return [
      {
        width: 300,
        key: 'title',
        title: t('common.title'),
        isSystem: true,
        overflowEllipsis: false,
        extraProps: {
          onClick: record => {
            openItemViewScreen(record?.objectId);
          },
        },
        shouldCellUpdate: (record, prevRecord) => {
          return (
            record._tableState.selectionMode !== prevRecord._tableState.selectionMode ||
            record.repository !== prevRecord.repository ||
            record.sortIndex !== prevRecord.sortIndex ||
            record.name !== prevRecord.name
          );
        },
        render(_, rowData) {
          const folderKey = rowData?.repository ?? UNGROUPED_FOLDER_KEY;

          return (
            <>
              <RowDragBox
                folderKey={folderKey}
                testId={rowData.objectId}
                sortIndex={rowData.sortIndex}
                rowData={rowData}
              >
                {!rowData._tableState.selectionMode ? (
                  <Tooltip
                    overlayClassName={`${cx('tooltip')} global_arrow_tooltip_overflow`}
                    title={t('page.repository.view.list.dropCaseToGroup')}
                  >
                    <DragHandler style={{ marginRight: 10 }} />
                  </Tooltip>
                ) : null}
                <span
                  className="test-case-title"
                  data-drawer-handle-target
                  data-element-id="row-title"
                  style={{ cursor: 'pointer' }}
                >
                  {rowData?.name}
                </span>
              </RowDragBox>
            </>
          );
        },
      },
      {
        key: 'quoteCount',
        title: t('page.plan.testEntityList.quoteCount'),
        width: 120,
        overflowEllipsis: false,
        shouldCellUpdate: (record, prevRecord) => record.quoteCount !== prevRecord.quoteCount,
        render(_, rowData) {
          return <span>{rowData.quoteCount}</span>;
        },
      },
      {
        key: 'repositoryGroup',
        title: t('page.plan.testEntityList.repositoryGroup'),
        width: 200,
        overflowEllipsis: false,
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
        overflowEllipsis: false,
        shouldCellUpdate: (record, prevRecord) => record.objectId !== prevRecord.objectId,
        render(_, rowData) {
          return (
            <Space>
              <CopyButton
                getQueryParams={() =>
                  getBatchParams({
                    selectedRowKeys: [rowData.objectId],
                    selectAll: false,
                  })
                }
                onStart={() => setTableLoading(true)}
                onFinished={() => {
                  onDataChange?.();
                  setTableLoading(false);
                }}
              >
                <a>{t('common.copy')}</a>
              </CopyButton>
              <a onClick={() => deleteTestDetail(rowData)}>{t('common.delete')}</a>
            </Space>
          );
        },
      },
    ];
  }, [getBatchParams, onDataChange, setTableLoading, t]);

  const handleFilterField = useMemoizedFn(async ({ testType, fieldKeys }) => {
    await saveUserSetting({
      workspaceKey,
      testType,
      filterFields: {
        ...(currentFields?.filterFields ?? {}),
        [testType]: fieldKeys,
      },
    });
  });

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
        onHasRowSelected={setHasRowSelected}
        onSelectionCancel={onSelectionCancel}
        loading={externalDataLoading || tableLoading}
        selectionActionNodes={selectionActionNodes}
        handleFilterField={handleFilterField}
        queryDeps={queryDeps}
        virtualSelectAll
      />
      <RepositorySelector actionRef={repositorySelectorRef} />
    </>
  );
};

export default React.memo(TestDetailTable);
