import { Tooltip } from 'antd';
import React, { useCallback, useState } from 'react';

import { RefreshIcon } from '@/icons';
import { judgeTestReportVersion, TEST_REPORT_VERSION } from '@/lib/appEnv';
import { TestReport } from '@/services/models';
import { testConfigQuery } from '@/services/query';

const Refresh: React.FC<any> = ({ report, workspaceKey, refresh: refreshIframe }) => {
  const { data: queryRes = {} } = testConfigQuery.useWorkspaceTestConfig({
    workspaceKey,
  }) as any;
  const { workspace, currentTestConfig: config } = queryRes;

  const [loading, setLoading] = useState(false);

  console.info(report, 'render');
  const refresh = useCallback(async () => {
    console.info(report, 'refresh');
    if (loading) return;
    try {
      setLoading(true);
      const refreshParams = {
        defectsMapping: config.defectsMapping,
        itemTypeMap: config.itemTypeMap,
        report,
        workspace,
        templateId: report.usingReportTemplate?.objectId,
        reportOverviewData: report.reportOverviewData,
        chartGroupId: report.chartGroup?.objectId,
      };
      if (judgeTestReportVersion(TEST_REPORT_VERSION.V2)) {
        refreshParams.templateId = report.reportTemplate;
        refreshParams.chartGroupId = report.reportChartGroup;
      }

      const testReport = new TestReport();
      await testReport.refreshReport(refreshParams);
      refreshIframe();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [config, loading, refreshIframe, report, workspace]);

  return (
    <Tooltip title={loading ? '测试报告数据重新加载中' : '刷新测试报告数据'}>
      <RefreshIcon spin={loading} onClick={refresh} />
    </Tooltip>
  );
};
export default React.memo(Refresh);
