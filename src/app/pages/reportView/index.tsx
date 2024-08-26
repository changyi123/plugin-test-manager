import React from 'react';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import { featureFlags, SupportFeatureFlags } from '@/lib/appEnv';

import ReportView from './ReportView';
import ReportViewV2 from './ReportViewV2';

const TestPlanPage = () => {
  const isV2 = featureFlags(SupportFeatureFlags.ENABLE_TEST_REPORT_V2);

  return <ErrorBoundary>{isV2 ? <ReportViewV2 /> : <ReportView />}</ErrorBoundary>;
};

export default React.memo(TestPlanPage);
