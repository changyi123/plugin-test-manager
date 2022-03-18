import React from 'react';
import { Pagination } from 'antd';
import { StatusBadge } from '@/components/business/Status';
import TestRunModal from '@/components/business/TestRunModal';
import { BusinessTable } from '@/components/common/BusinessTable';

import cx from './executionTable.less';

interface ExpandedTableProps {
  InnerTableSelectionActionNodes: any;
  refreshAndMutateData: () => void;
  tableSelectionToggleEvent: any;
  record: any;
  updateTestRun: any;
  openItemViewScreen: any;
  innerTableRef: any;
}

const ExpandedTable = (props: ExpandedTableProps) => {
  const [pageNum, setPageNum] = React.useState(1);

  const {
    InnerTableSelectionActionNodes,
    refreshAndMutateData,
    tableSelectionToggleEvent,
    record,
    updateTestRun,
    openItemViewScreen,
    innerTableRef,
  } = props;

  // 测试执行序列
  const testIdSequence = record.relRuns?.map(item => item?.objectId).filter(Boolean);
  const handleTestRunStatusChange = async (testRunId, status) => {
    await updateTestRun(testRunId, { status: status.key });
    refreshAndMutateData();
  };

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
