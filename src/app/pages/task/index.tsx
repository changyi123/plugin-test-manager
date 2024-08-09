import React from 'react';

import { logPluginVersion } from '@/lib/utils/helper';

import PageProvider from '../plan/PageProvider';
import TaskPageLayout from '../plan/PlanPageLayout/task';

logPluginVersion();

const TestPlanPage = () => {
  return (
    <PageProvider>
      <TaskPageLayout />
    </PageProvider>
  );
};

export default TestPlanPage;
