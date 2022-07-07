import React, { useState } from 'react';
import { Tabs } from 'antd';
import TestPlanList from '@/components/business/TestPlanList';
import PageLayout from '@/components/common/PageLayout';
import { useResizeContainerDOM } from './hooks';
import { ArrowLeftOutlined } from '@ant-design/icons';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import { usePageContext } from '../hook';
import Main from '../Main';

import cx from './index.less';

const { TabPane } = Tabs;

const PlanPageLayout: React.FC<any> = () => {
  const { selectedTestPlan, setSelectedTestPlan } = usePageContext();
  useResizeContainerDOM(selectedTestPlan?.objectId);

  const [testType, setTestType] = useState('allTest');

  return (
    <div className={cx('test-plan-page')}>
      {!selectedTestPlan?.objectId ? (
        <TestPlanList />
      ) : (
        <PageLayout>
          <PageLayout.Header>
            <div className={cx('page-header')}>
              <ArrowLeftOutlined
                className={cx('icon')}
                onClick={() => setSelectedTestPlan(undefined)}
              />
              <TestPlanSelector />
              <div>
                <Tabs defaultActiveKey={testType} onChange={type => setTestType(type)}>
                  <TabPane tab="全部用例" key="allTest"></TabPane>
                  <TabPane tab="测试执行任务" key="excetion"></TabPane>
                </Tabs>
              </div>
            </div>
          </PageLayout.Header>
          <PageLayout.Left>{/* <PlanList /> */}</PageLayout.Left>
          <PageLayout.Right>
            <Main />
          </PageLayout.Right>
        </PageLayout>
      )}
    </div>
  );
};

export default PlanPageLayout;
