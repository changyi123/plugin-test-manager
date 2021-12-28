import React, { Suspense } from 'react';
import { Tabs, Spin } from '@osui/ui';
import { TestType } from '@/lib/constants';
import Loading from '@/components/common/Loading';

import css from './index.less';

const { TabPane } = Tabs;

const tabConfig: Array<{
  tab: string;
  key: string;
  Component?: React.FC;
}> = [
  {
    tab: '详情',
    key: TestType.TestDetail,
    // TODO: 待检验懒加载是否成功
    Component: React.lazy(() => import('./components/detail')),
  },
  // {
  //   tab: '前置条件',
  //   key: TestType.Precondition,
  //   Component: React.lazy(() => import('./components/preconditions')),
  // },
  // {
  //   tab: '测试集合',
  //   key: TestType.TestSet,
  //   Component: () => <div>测试集合</div>,
  // },
  {
    tab: '测试计划',
    key: TestType.TestPlan,
    Component: React.lazy(() => import('./components/plan')),
  },
  {
    tab: '测试运行',
    key: TestType.TestRun,
    Component: React.lazy(() => import('./components/runs')),
  },
];

const TestDetail: React.FC = () => {
  return (
    <div className={css('detail')}>
      <Tabs defaultActiveKey={TestType.TestDetail}>
        {tabConfig.map(({ tab, key, Component }) => (
          <TabPane tab={tab} key={key}>
            <Suspense fallback={<Loading />}>{Component && <Component />}</Suspense>
          </TabPane>
        ))}
      </Tabs>
    </div>
  );
};

export default TestDetail;
