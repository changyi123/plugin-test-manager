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
import { BusinessTable } from '@/components/common/BusinessTable';
import RepositoryGroup from '@/components/business/RepositoryGroup';
import { DeleteOutlined, FlagOutlined, UserOutlined } from '@/icons';
import { TitleCellOption } from '@/components/common/BusinessTable/type';
import { deleteTestEntities, updateTestRunDesignee } from '@/lib/api/common';

import cx from './ExecutionTable.less';

type ExpandedTableProps = TitleCellOption & {
  refreshAndMutateData: () => void;
  record: any;
  updateTestRun: any;
  innerTableRef: any;
  innerTableRefs?: any;
  openItemViewScreen: any;
  removeTestRelation: any;
  tableSelectionToggleEvent: any;
};

const ExpandedTable = (props: ExpandedTableProps) => {
  const [pageNum, setPageNum] = React.useState(1);
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();
  const [isCheck, setIsCheck] = React.useState(false);

  const {
    record,
    updateTestRun,
    innerTableRef,
    innerTableRefs,
    titleCellOption,
    removeTestRelation,
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

  /** 根据列表记录删除测试执行 */
  const deleteTestRunByRows = React.useCallback(
    rows => {
      actionConfirm('该操作会将所选测试执行删除，是否继续操作？', () => {
        // 删除关联关系，删除测试实体
        deleteTestEntities(rows.map(row => row.objectId));
        removeTestRelation(
          rows.map(row => row.relation.objectId),
          {
            message: `${rows.length} 个测试执行任务被删除`,
          },
        );
      });
    },
    [removeTestRelation],
  );

  const userData = useUserCellUserDataProp(titleCellOption.workspaceKey);

  const InnerTableSelectionActionNodes = React.useMemo(() => {
    const toggleSTestRunStatus = async status => {
      const refs = Object.values(innerTableRefs.current) as any[];
      const testRunIds = refs.reduce((acc, ref) => Array.from(acc.concat(ref.selectedRowKeys)), []);

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
      const selectedRows = (
        Object.values(innerTableRefs.current).reduce((res: any, ref: any) => {
          return res.concat(ref.selectedRows);
        }, []) as any[]
      )
        .filter(Boolean)
        .filter(row => record.objectId === row.relation.from.objectId);

      deleteTestRunByRows(selectedRows);
    };

    // 更新测试执行人
    const handleDesigneeChange = async users => {
      const selectedRows = (
        Object.values(innerTableRefs.current).reduce((res: any, ref: any) => {
          return res.concat(ref.selectedRows);
        }, []) as any[]
      )
        .filter(Boolean)
        .filter(row => record.objectId === row.relation.from.objectId);

      const testRunIds = selectedRows.map(item => item.objectId);

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
        readonly={!isCheck}
        userData={userData}
        onChange={handleDesigneeChange}
        emptyChild={
          <span className="user-field">
            <UserOutlined /> 更改执行人
          </span>
        }
      />,
      <StatusBadge
        useRootContainer
        onStatusChange={toggleSTestRunStatus}
        key="toggleRunStatus"
        emptyNode={
          <span>
            <FlagOutlined /> 更改执行状态
          </span>
        }
      />,

      <span key="delete" onClick={deleteTestRun}>
        <DeleteOutlined /> 删除
      </span>,
    ];
  }, [
    isCheck,
    userData,
    innerTableRefs,
    record.objectId,
    deleteTestRunByRows,
    refreshAndMutateData,
  ]);

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
                deleteTestRunByRows([record]);
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
        setIsCheck={setIsCheck}
        actionRef={innerTableRef}
        name="ExecutionInnerTable"
        className={cx('expand-table')}
        expandChangePage={relPageChange}
        titleCellOption={titleCellOption}
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
