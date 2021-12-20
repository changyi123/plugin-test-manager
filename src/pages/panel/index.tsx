import React from 'react';

import TestPlan from './TestPlan';
import TestDetail from './TestDetail';
import { TestType } from '@/lib/constants';
import { PanelItemId } from '@/devEnv';
import { useSDK } from '@projectproxima/plugin-sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import TestManagerProvider from '@/components/common/TestManagerProvider';

import cx from './index.less';

// 根据测试类型打开不同的测试 panel
const TestPanelComponents = {
  [TestType.TestDetail]: TestDetail,
  [TestType.TestPlan]: TestPlan,
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
  const itemId = context?.itemId ?? PanelItemId;

  return (
    <TestManagerProvider itemId={itemId}>
      <TestPanel />
    </TestManagerProvider>
  );
};

export default React.memo(TestPanelPage);
