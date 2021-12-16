import React from 'react';

import TestDetail from './TestDetail';
import { useSDK } from '@projectproxima/plugin-sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import TestManagerProvider from '@/components/common/TestManagerProvider';
import { TestType } from '@/lib/constants';

import cx from './index.less';

const MOCK_ITEM_ID = 'bKDW597G4A';
const MOCK_WORKSPACE_KEY = 'TEST_MANAGE_1';

// 根据测试类型打开不同的测试 panel
const TestPanelComponents = {
  [TestType.TestDetail]: TestDetail,
};

const TestPanel = () => {
  const { testEntity } = useTestConfig();

  const panelRenderNode = React.useMemo(() => {
    if (!testEntity) return null;
    console.info('testEntity', testEntity.toJSON());
    const testType = testEntity.get('type');

    const TestPanelComponent = TestPanelComponents[testType];

    return TestPanelComponent ? <TestPanelComponent /> : null;
  }, [testEntity]);

  return <div className={cx('test-panel')}>{panelRenderNode}</div>;
};

const TestPanelPage = () => {
  const { context } = useSDK();
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? MOCK_WORKSPACE_KEY;
  const itemId = context?.itemId ?? MOCK_ITEM_ID;

  return (
    <TestManagerProvider itemId={itemId} workspaceKey={workspaceKey}>
      <TestPanel />
    </TestManagerProvider>
  );
};

export default React.memo(TestPanelPage);
