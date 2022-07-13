import React from 'react';
import Main from './Main';
import PlanList from './PlanList';
import PageProvider from './PageProvider';
import { logPluginVersion } from '@/lib/utils/helper';
import PageLayout from '@/components/common/PageLayout';

import cx from './index.less';

logPluginVersion();

const TestPlanPage = () => {
  return (
    <PageProvider>
      <PageLayout>
        <PageLayout.Header>
          <header className={cx('header')}>测试计划</header>
        </PageLayout.Header>
        <PageLayout.Left>
          <PlanList />
        </PageLayout.Left>
        <PageLayout.Right>
          <Main />
        </PageLayout.Right>
      </PageLayout>
    </PageProvider>
  );
};

export default TestPlanPage;
