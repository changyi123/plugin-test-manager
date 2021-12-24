import React from 'react';
import { Tabs, Spin } from '@osui/ui';
import { TestType } from '@/lib/constants';
import { getDevConfig } from '@/devEnv';
import { useSDK } from '@projectproxima/plugin-sdk';
import TestManagerProvider from '@/components/common/TestManagerProvider';

import cx from './index.less';

const { TabPane } = Tabs;
const PlanTabs = [
  {
    tab: '测试执行',
    key: TestType.TestExecution,
    Component: React.lazy(() => import('./components/Test')),
  },
];

const TestExecution = () => {
  return (
    <div className={cx('plan')}>
      <Tabs destroyInactiveTabPane defaultActiveKey={TestType.TestDetail}>
        {PlanTabs.map(({ tab, key, Component }) => (
          <TabPane tab={tab} key={key}>
            <React.Suspense fallback={<Spin tip="加载中..."></Spin>}>
              {Component && <Component />}
            </React.Suspense>
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
};

const TestExecutionPage = () => {
  const { context } = useSDK();
  const itemId = context?.itemId ?? getDevConfig().itemId;

  return (
    <TestManagerProvider itemId={itemId}>
      <TestExecution />
    </TestManagerProvider>
  );
};

export default React.memo(TestExecutionPage);
