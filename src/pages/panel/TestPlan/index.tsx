import React from 'react';
import { Tabs, Spin } from '@osui/ui';
import { TestType } from '@/lib/constants';

import cx from './index.less';

const { TabPane } = Tabs;
const PlanTabs = [
  {
    key: TestType.TestDetail,
    tab: '测试用例',
    Component: React.lazy(() => import('./components/Test')),
  },
  {
    key: TestType.TestExecution,
    tab: '测试执行',
    Component: React.lazy(() => import('./components/Execution')),
  },
];

const TestPlan = () => {
  return (
    <div className={cx('plan')}>
      <Tabs defaultActiveKey={TestType.TestDetail}>
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
