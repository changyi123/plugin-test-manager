import { Button } from 'antd';
import React, { useCallback, useRef } from 'react';

import { BusinessTable, BusinessTableActionType } from '@/components/common/BusinessTable';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getProximaBasePath, getTenantKey } from '@/lib/utils/helper';
import { useWorkspaceReportListQuery } from '@/services/testReport/query';

import ReportLinkPlan from '../../ReportLinkPlan';
import ReportStatus from '../../ReportStatus';
import cx from './index.less';

const List: React.FC<any> = () => {
  const { t } = useI18n();
  const { workspace } = useTestConfig();
  const workspaceKey = workspace?.key;
  const { data: dataSource, isLoading } = useWorkspaceReportListQuery({
    workspace: workspace?.objectId,
    pagination: { limit: 10, offset: 0 },
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
      className: 'test-case-title',
      render(_, rowData) {
        return (
          <div className={'test-plan-title-box'}>
            <div className={'test-plan-title'}>{rowData.name}</div>
          </div>
        );
      },
    },
    {
      key: 'reportStatus',
      title: '状态',
      width: 100,
      render(_, rowData) {
        return <ReportStatus status={rowData?.reportStatus} />;
      },
    },
    {
      key: 'linkPlanId',
      title: '测试计划',
      width: 200,
      render(_, rowData) {
        return <ReportLinkPlan linkPlanId={rowData?.reportOverviewData?.linkPlanId} />;
      },
    },
    {
      key: 'action',
      title: '操作',
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
              查看
            </Button>
            {/* <Button type="link" size="small">
              下载
            </Button> */}
            <Button type="link" size="small">
              删除
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
        />
      )}
    </div>
  );
};

export default List;
