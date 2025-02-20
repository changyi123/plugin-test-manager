import React from 'react';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import BasicPageLayout from '@/components/common/PageLayout/Basic';
import { judgeTestReportVersion, TEST_REPORT_VERSION } from '@/lib/appEnv';
import { logPluginVersion } from '@/lib/utils/helper';

import PageProvider from '../plan/PageProvider';
import TestReportPage from './Report';
import TestReportV2Page from './ReportV2';

logPluginVersion();

const TestPlanPage = () => {
  const isV2 = judgeTestReportVersion(TEST_REPORT_VERSION.V2);

  return (
    <ErrorBoundary>
      <PageProvider>
        <BasicPageLayout>{isV2 ? <TestReportV2Page /> : <TestReportPage />}</BasicPageLayout>
      </PageProvider>
    </ErrorBoundary>
  );
};

export default React.memo(TestPlanPage);
