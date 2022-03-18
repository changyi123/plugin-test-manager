import React from 'react';
import { Pagination } from 'antd';
import { StatusBadge } from '@/components/business/Status';
import TestRunModal from '@/components/business/TestRunModal';
import { BusinessTable } from '@/components/common/BusinessTable';

import cx from './executionTable.less';
import { actionConfirm } from '@/lib/utils/helper';
import { deleteTestEntities } from '@/lib/api/common';
import { updateTestRunStatus } from '@/lib/api/runs';
import { notification } from '@osui/ui';
import { DeleteOutlined } from '@/icons';

interface ExpandedTableProps {
  refreshAndMutateData: () => void;
  tableSelectionToggleEvent: any;
  record: any;
  updateTestRun: any;
  openItemViewScreen: any;
  innerTableRef: any;
  innerTableRefs?: any;
  removeTestRelation: any;
}

const ExpandedTable = (props: ExpandedTableProps) => {
  const [pageNum, setPageNum] = React.useState(1);

  const {
    innerTableRefs,
    refreshAndMutateData,
    tableSelectionToggleEvent,
    record,
    updateTestRun,
    openItemViewScreen,
    innerTableRef,
    removeTestRelation,
  } = props;

  // 测试执行序列
  const testIdSequence = record.relRuns?.map(item => item?.objectId).filter(Boolean);
  const handleTestRunStatusChange = async (testRunId, status) => {
    await updateTestRun(testRunId, { status: status.key });
    refreshAndMutateData();
  };

  const InnerTableSelectionActionNodes = React.useMemo(() => {
    const deleteTestRun = () => {
      const selectedRows = (
        Object.values(innerTableRefs.current).reduce((res: any, ref: any) => {
          return res.concat(ref.selectedRows);
        }, []) as any[]
      )
        .filter(Boolean)
        .filter(row => record.objectId === row.relation.from.objectId);

      actionConfirm('该操作会将所选测试执行删除，是否继续操作？', () => {
        // 删除关联关系，删除测试实体
        deleteTestEntities(selectedRows.map(row => row.objectId));
        removeTestRelation(selectedRows.map(row => row.relation.objectId));
      });
    };

    const toggleSTestRunStatus = async status => {
      const selectedRows = (
        Object.values(innerTableRefs.current).reduce((res: any, ref: any) => {
          return res.concat(ref.selectedRows);
        }, []) as any[]
      )
        .filter(Boolean)
        .filter(row => record.objectId === row.relation.from.objectId);

      const testRunIds = selectedRows.map(item => item.objectId);
      await updateTestRunStatus({
        status: status.key,
        testRun: testRunIds,
      });
      notification.success({
        message: '所选测试执行状态更新成功',
      });
      refreshAndMutateData();
    };

    return [
      <StatusBadge
        useRootContainer
        onStatusChange={toggleSTestRunStatus}
        key="toggleRunStatus"
        emptyNode={
          <span>
            <DeleteOutlined /> 设置状态
          </span>
        }
      />,

      <span key="delete" onClick={deleteTestRun}>
        <DeleteOutlined /> 删除
      </span>,
    ];
  }, [refreshAndMutateData, removeTestRelation]);

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
      key: 'action',
      title: '操作',
      isSystem: true,
      fixed: 'right' as any,
      render(_, record) {
        return (
          <TestRunModal
            testId={record.objectId}
            testIdSequence={testIdSequence}
            onCancel={() =>
              setTimeout(() => {
                refreshAndMutateData(); //刷新依赖数据
              }, 200)
            }
            trigger={<a>执行</a>}
          />
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

  const relPageChange = (current: number, size?: number) => setPageNum(current);

  return (
    <div className={cx('expand-container')}>
      <BusinessTable
        className={cx('expand-table')}
        rowKey="objectId"
        columns={columns}
        useColumnSetting
        showPagination={true}
        actionRef={innerTableRef}
        name="ExecutionInnerTable"
        scroll={{ x: 'max-content', y: 500 }}
        itemKey="runReferenceDetail.reference"
        expandChangePage={relPageChange}
        PaginationFooterRender={PaginationFooterRender}
        selectionActionNodes={InnerTableSelectionActionNodes}
        onSelectionCancel={() => tableSelectionToggleEvent.emit(false)}
        dataSource={record.relRuns.slice((pageNum - 1) * 10, pageNum * 10)}
      />
    </div>
  );
};

export default ExpandedTable;
