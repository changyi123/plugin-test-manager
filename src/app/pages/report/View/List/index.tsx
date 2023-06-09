import { useListener } from '@projectproxima/proxima-sdk-js';
import { Button, Pagination } from 'antd';
import React, { useCallback, useRef, useState } from 'react';

import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { actionConfirm, getProximaBasePath, getTenantKey } from '@/lib/utils/helper';
import { TestReport } from '@/services/models';
import { useWorkspaceReportListQuery } from '@/services/testReport/query';

import ReportLinkPlan from '../../ReportLinkPlan';
import ReportStatus from '../../ReportStatus';
import cx from './index.less';

const PaginationFooterRender: React.FC<any> = ({
  showPagination,
  limit,
  offset,
  total,
  setOffset,
  setLimit,
}) => {
  const { t } = useI18n();
  if (!showPagination) return null;
  const handlePaginationChange = (current, pageSize) => {
    limit !== pageSize && setLimit(pageSize);
    current !== offset && setOffset(current);
  };

  return (
    <div className={`${cx('report-footer')}`}>
      <div className={cx('num')}>
        {t('common.tableTotal.0')} <span>{total}</span> {t('common.tableTotal.1')}
      </div>
      <Pagination
        size="small"
        showSizeChanger={true}
        className={cx('pagination')}
        pageSizeOptions={[10, 20, 50]}
        defaultPageSize={limit}
        current={offset}
        total={total}
        onChange={handlePaginationChange}
      />
    </div>
  );
};

const List: React.FC<any> = () => {
  const { t } = useI18n();
  const { workspace } = useTestConfig();
  const workspaceKey = workspace?.key;

  const [limit, setLimit] = useState<number>(10);
  const [offset, setOffset] = useState<number>(1);

  const {
    data: { results: dataSource, count: total },
    isLoading,
    refetch,
  } = useWorkspaceReportListQuery({
    workspace: workspace?.objectId,
    pagination: { limit, offset: (offset - 1 || 0) * limit },
  });

  useListener('refreshTestReportTable', id => {
    if (!id) return;
    refetch?.();
    window.open(genReportDetail(id), '_blank');
  });

  const genReportDetail = useCallback(
    reportId => {
      const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
      // 跳转到导入页面
      const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspaceKey}/plugin/test_manager_test-report/?fromWorkspace=${workspaceKey}&reportId=${reportId}&detail=true`;

      return href;
    },
    [workspaceKey],
  );

  const actionRef = useRef<BusinessTableActionType>();
  const columns: any = [
    {
      width: 200,
      key: 'title',
      fixed: true,
      isSystem: true,
      title: t('common.title'),
      render(_, rowData) {
        return (
          <div
            className={cx('test-report-title')}
            onClick={() => {
              window.open(genReportDetail(rowData.objectId), '_blank');
            }}
          >
            {rowData.name}
          </div>
        );
      },
    },
    {
      key: 'reportStatus',
      title: t('common.status'),
      width: 100,
      render(_, rowData) {
        return <ReportStatus status={rowData?.reportStatus} />;
      },
    },
    {
      key: 'linkPlanId',
      title: t('common.testPlan'),
      width: 200,
      render(_, rowData) {
        return <ReportLinkPlan linkPlanId={rowData?.reportOverviewData?.linkPlanId} />;
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
          <>
            <Button
              type="link"
              size="small"
              onClick={() => {
                window.open(genReportDetail(rowData.objectId), '_blank');
              }}
            >
              {t('report.view')}
            </Button>
            {/* <Button type="link" size="small">
              {t('common.download')}
            </Button> */}
            <Button
              type="link"
              size="small"
              onClick={async () => {
                actionConfirm(
                  {
                    title: t('common.tip'),
                    okText: t('common.okText'),
                    cancelText: t('common.cancel'),
                    content: <span>{t('report.deleteTip1')}</span>,
                  },
                  async () => {
                    const testReport = new TestReport();
                    await testReport.delete(rowData.objectId);
                    refetch();
                  },
                );
              }}
            >
              {t('common.delete')}
            </Button>
          </>
        );
      },
    },
  ];

  return (
    <div className={cx('report-list')}>
      {workspace?.key && (
        <BusinessTable
          titleCellOption={{
            workspaceKey: workspace?.key,
            testType: TestType.Plan,
            isHideIcon: true,
          }}
          defaultColumnKey={['reportStatus', 'linkPlanId', 'createdBy', 'createdAt']}
          privateColumnKey={['reportStatus', 'linkPlanId']}
          useColumnSetting
          rowKey="objectId"
          name={`${workspace?.key}_test_report`}
          columns={columns}
          actionRef={actionRef}
          loading={isLoading}
          dataSource={dataSource}
          PaginationFooterRender={() => (
            <PaginationFooterRender
              showPagination={true}
              limit={limit}
              offset={offset}
              total={total}
              setLimit={setLimit}
              setOffset={setOffset}
            />
          )}
        />
      )}
    </div>
  );
};

export default List;
