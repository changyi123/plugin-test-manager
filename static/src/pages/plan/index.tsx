import React from 'react';
import { logPluginVersion } from '@/lib/utils/helper';
import PageProvider from './PageProvider';
import PlanPageLayout from './PlanPageLayout';

logPluginVersion();

const TestPlanPage = () => {
  return (
    <PageProvider>
      <PlanPageLayout />
    </PageProvider>
  );
};

export default TestPlanPage;
