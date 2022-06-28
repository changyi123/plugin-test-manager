import React from 'react';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';

import Field from '@/components/common/Field';
import { Pagination, notification } from 'antd';
import { actionConfirm } from '@/lib/utils/helper';
import { updateTestRunStatus } from '@/lib/api/runs';
import { UserCell } from '@projectproxima/components';
import { StatusBadge } from '@/components/business/Status';
import { useUserCellUserDataProp } from '@/lib/hooks/useProxima';
import RepositoryGroup from '@/components/business/RepositoryGroup';
import { DeleteOutlined, FlagOutlined, UserOutlined } from '@/icons';
import { TitleCellOption } from '@/components/common/BusinessTable/type';
import { deleteTestEntities, updateTestRunDesignee } from '@/lib/api/common';
import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';

import cx from './ExecutionTable.less';

type ExpandedTableProps = TitleCellOption & {
  record: any;
  updateTestRun: any;
  innerTableRef: any;
  openItemViewScreen: any;
  tableSelectionToggleEvent: any;
  refreshAndMutateData: (option?: any) => void;
};

const ExpandedTable = (props: ExpandedTableProps) => {
  const [pageNum, setPageNum] = React.useState(1);
  const tableActionRef = React.useRef<BusinessTableActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();
  const [hasRowSelected, setHasRowSelected] = React.useState(false);

  const {
    record,
    updateTestRun,
    innerTableRef,
    titleCellOption,
    openItemViewScreen,
    refreshAndMutateData,
    tableSelectionToggleEvent,
  } = props;

  // 测试执行序列
  const testIdSequence = record.relRuns?.map(item => item?.objectId).filter(Boolean);
  const handleTestRunStatusChange = async (testRunId, status) => {
    await updateTestRun(testRunId, { status: status.key });
    refreshAndMutateData();
  };

  React.useImperativeHandle(innerTableRef, () => tableActionRef, []);

  /** 根据列表记录删除测试执行 */
  const deleteTestRunByIds = React.useCallback(
    testRunIds => {
      actionConfirm('该操作会将所选测试执行删除，是否继续操作？', async () => {
        // 删除关联关系，删除测试实体
        await deleteTestEntities(testRunIds);
        notification.success({
          message: `${testRunIds.length} 个测试执行任务被删除`,
        });
        refreshAndMutateData({
          shouldRestCurrentPage: true,
          shouldRestSelectedRowKeys: true,
        });
      });
    },
    [refreshAndMutateData],
  );

  const userData = useUserCellUserDataProp(titleCellOption.workspaceKey);

  const InnerTableSelectionActionNodes = React.useMemo(() => {
    const getTestRunIds = () => tableActionRef.current.selectedRowKeys;
    const toggleSTestRunStatus = async status => {
      const testRunIds = getTestRunIds();

      await updateTestRunStatus({
        status: status.key,
        testRunIds,
      });
      notification.success({
        message: '所选测试执行状态更新成功',
      });
      refreshAndMutateData();
    };

    const deleteTestRun = () => {
      const testRunIds = getTestRunIds();

      deleteTestRunByIds(testRunIds);
    };

    // 更新测试执行人
    const handleDesigneeChange = async users => {
      const testRunIds = getTestRunIds();

      users = users.map(user => ({
        ...user,
        objectId: user.value,
      }));

      await updateTestRunDesignee(testRunIds, users);
      refreshAndMutateData();
    };

    return [
      <UserCell
        value={[]}
        key="assignee"
        mode="multiple"
        userData={userData}
        readonly={!hasRowSelected}
        onChange={handleDesigneeChange}
        emptyChild={
          <span className="user-field">
            <UserOutlined /> 更改执行人
          </span>
        }
      />,
      <StatusBadge
        useRootContainer
        readonly={!hasRowSelected}
        onStatusChange={toggleSTestRunStatus}
        key="toggleRunStatus"
        emptyNode={
          <span>
            <FlagOutlined /> 更改执行状态
          </span>
        }
      />,

      <span key="delete" onClick={() => hasRowSelected && deleteTestRun()}>
        <DeleteOutlined /> 删除
      </span>,
    ];
  }, [userData, hasRowSelected, refreshAndMutateData, deleteTestRunByIds]);

  const columns = [
    {
      key: 'detailName',
      title: '用例标题',
      isSystem: true,
      fixed: true,
      width: 160,
      tooltip: true,
      render(_, record) {
        const detailItemData = record.runReferenceDetail?.reference ?? {};
        return (
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => openItemViewScreen(detailItemData.objectId)}
          >
            {detailItemData.name}
          </span>
        );
      },
    },
    {
      key: 'repositoryGroup',
      title: '所属模块',
      width: 240,
      render(_, rowData) {
        return <RepositoryGroup rowData={rowData.runReferenceDetail}></RepositoryGroup>;
      },
    },
    {
      key: 'runStatus',
      title: '测试执行状态',
      width: 150,
      render(_, record) {
        return (
          <StatusBadge
            useRootContainer
            status={record.status}
            onStatusChange={status => handleTestRunStatusChange(record.objectId, status)}
          />
        );
      },
    },
    {
      key: 'executor',
      title: '最近操作执行人',
      width: 150,
      render(_, record) {
        return <Field.User readonly userInfo={record?.executor?.[0]} />;
      },
    },
    {
      key: 'designee',
      title: '执行人',
      width: 150,
      render(_, record) {
        return <Field.User userInfo={record?.designee} />;
      },
    },
    {
      key: 'action',
      title: '操作',
      isSystem: true,
      fixed: 'right' as any,
      render(_, record) {
        return (
          <>
            <a
              onClick={async () => {
                await testRunModalActionRef.current.open({
                  testId: record.objectId,
                  testIdSequence,
                });
                // 刷新依赖数据
                refreshAndMutateData();
              }}
            >
              执行
            </a>
            <a
              style={{ marginLeft: 10 }}
              onClick={async () => {
                deleteTestRunByIds([record.objectId]);
              }}
            >
              删除
            </a>
          </>
        );
      },
    },
  ];

  const PaginationFooterRender = () => {
    return (
      <div className={cx('footer')}>
        <div className={cx('num')}>
          共 <span>{record.relRuns.length}</span> 个
        </div>
        <Pagination
          size="small"
          current={pageNum}
          defaultPageSize={10}
          pageSizeOptions={[10]}
          showSizeChanger={false}
          onChange={relPageChange}
          className={cx('pagination')}
          total={record.relRuns.length}
        />
      </div>
    );
  };

  const relPageChange = (current: number) => setPageNum(current);

  return (
    <div className={cx('expand-container')}>
      <BusinessTable
        rowKey="objectId"
        columns={columns}
        useColumnSetting
        defaultColumnKey={[
          'key',
          'repositoryGroup',
          'designee',
          'runStatus',
          'createdBy',
          'createdAt',
          'executor',
        ]}
        showPagination={true}
        actionRef={tableActionRef}
        name="ExecutionInnerTable"
        className={cx('expand-table')}
        expandChangePage={relPageChange}
        titleCellOption={titleCellOption}
        onHasRowSelected={setHasRowSelected}
        allSelectableRowKeys={testIdSequence}
        scroll={{ x: 'max-content', y: 500 }}
        itemKey="runReferenceDetail.reference"
        PaginationFooterRender={PaginationFooterRender}
        selectionActionNodes={InnerTableSelectionActionNodes}
        onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
        dataSource={record.relRuns.slice((pageNum - 1) * 10, pageNum * 10)}
      />
      <TestRunModal actionRef={testRunModalActionRef} />
    </div>
  );
};

export default ExpandedTable;
