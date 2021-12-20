import React from 'react';
import { Tabs, Spin } from '@osui/ui';
import { TestType } from '@/lib/constants';

import cx from './index.less';

const { TabPane } = Tabs;
const PlanTabs = [
  {
    tab: '测试用例',
    key: TestType.TestDetail,
    Component: React.lazy(() => import('./components/Test')),
  },
  {
    tab: '测试执行',
    key: TestType.TestExecution,
    Component: React.lazy(() => import('./components/Execution')),
  },
];

const TestPlan = () => {
  return (
    <div className={cx('plan')}>
      <Tabs destroyInactiveTabPane defaultActiveKey={TestType.TestExecution}>
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

export default React.memo(TestPlan);
