import { useSDK } from '@projectproxima/plugin-sdk';
import React from 'react';

import TestManagerProvider from '@/components/business/TestManagerProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import getDevConfig from '@/devEnv';
import { logPluginVersion } from '@/lib/utils/helper';
import { useResizeContainerDOM } from '@/pages/plan/PlanPageLayout/hooks';

import ReportHeader from './View/Header';
import List from './View/List';

logPluginVersion();

const TestPlanPage = () => {
  const { context } = useSDK();

  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;
  useResizeContainerDOM();
  return (
    <ErrorBoundary>
      <TestManagerProvider workspaceKey={workspaceKey}>
        <div style={{ height: '100%' }}>
          <ReportHeader />
          <List />
        </div>
      </TestManagerProvider>
    </ErrorBoundary>
  );
};

export default React.memo(TestPlanPage);
