import React from 'react';

import { getDevConfig } from '@/devEnv';
import { useSDK } from '@projectproxima/plugin-sdk';
import TestManagerProvider from '@/components/common/TestManagerProvider';
import TestRun from './index';

const TestPanelPage = () => {
  const { context } = useSDK();
  const itemId = context?.itemId ?? getDevConfig().itemId;

  return (
    <TestManagerProvider itemId={itemId}>
      <TestRun />
    </TestManagerProvider>
  );
};

export default React.memo(TestPanelPage);
