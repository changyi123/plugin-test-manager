import { useSDK } from '@projectproxima/plugin-sdk';
import React from 'react';

import TestManagerProvider from '@/components/business/TestManagerProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import getDevConfig from '@/devEnv';
import { logPluginVersion } from '@/lib/utils/helper';

import View from './View';

logPluginVersion();

const TestPlanPage = () => {
  const { context } = useSDK();

  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;
  return (
    <ErrorBoundary>
      <TestManagerProvider workspaceKey={workspaceKey}>
        <View />
      </TestManagerProvider>
    </ErrorBoundary>
  );
};

export default React.memo(TestPlanPage);
