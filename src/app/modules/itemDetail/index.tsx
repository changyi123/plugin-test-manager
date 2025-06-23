import { useSDK } from '@projectproxima/plugin-sdk';
import { TestType } from 'common/constant';
import React, { useMemo } from 'react';

import TestManagerProvider from '@/components/business/TestManagerProvider';
import getDevConfig from '@/devEnv';
import { useTestConfig } from '@/lib/hooks/useContext';

import TestDetailPanel from '../panel/TestDetail/TestDetailPanel';

const ItemDetail = () => {
  const { testEntity, generalSetting } = useTestConfig();

  const show = useMemo(() => {
    return testEntity?.type === TestType.Case && generalSetting?.caseDetailExtra;
  }, [testEntity, generalSetting?.caseDetailExtra]);

  return show ? <TestDetailPanel /> : null;
};

const ItemDetailWrapper = () => {
  const { context } = useSDK();
  const itemId = context?.itemId ?? getDevConfig().itemId;
  const baseLineItemId = context?.baseLineItemId ?? getDevConfig().baseLineItemId;
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;

  return (
    <TestManagerProvider
      workspaceKey={workspaceKey}
      itemId={itemId}
      baseLineItemId={baseLineItemId}
    >
      <ItemDetail />
    </TestManagerProvider>
  );
};

export default React.memo(ItemDetailWrapper);
