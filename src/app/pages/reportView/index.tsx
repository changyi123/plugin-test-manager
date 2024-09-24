import React from 'react';

import ErrorBoundary from '@/components/common/ErrorBoundary';

import ReportView from './ReportView';
import ReportViewV2 from './ReportViewV2';

const TestPlanPage = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const isV2 = searchParams.get('isV2');

  return <ErrorBoundary>{isV2 ? <ReportViewV2 /> : <ReportView />}</ErrorBoundary>;
};

export default React.memo(TestPlanPage);
