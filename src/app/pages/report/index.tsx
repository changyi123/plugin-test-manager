import React from 'react';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import { judgeTestReportVersion, TEST_REPORT_VERSION } from '@/lib/appEnv';
import { logPluginVersion } from '@/lib/utils/helper';
import { useResizeContainerDOM } from '@/pages/plan/PlanPageLayout/hooks';

import PageProvider from '../plan/PageProvider';
import TestReportPage from './Report';
import TestReportV2Page from './ReportV2';

logPluginVersion();

const TestPlanPage = () => {
  const isV2 = judgeTestReportVersion(TEST_REPORT_VERSION.V2);

  useResizeContainerDOM();
  return (
    <ErrorBoundary>
      <PageProvider>{isV2 ? <TestReportV2Page /> : <TestReportPage />}</PageProvider>
    </ErrorBoundary>
  );
};

export default React.memo(TestPlanPage);
