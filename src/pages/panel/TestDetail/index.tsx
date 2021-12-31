import React from 'react';
import { TestType } from '@/lib/constants';

import PanelLayout from '@/components/panel/PanelLayout';

import TestDetailPanel from './TestDetailPanel';
import TestPlanPanel from './TestPlanPanel';
import TestRunPanel from './TestRunPanel';

const TestDetail: React.FC = () => {
  const tabs = [
    {
      tab: '详情',
      key: TestType.TestDetail,
      Component: TestDetailPanel,
    },
    {
      tab: '测试计划',
      key: TestType.TestPlan,
      Component: TestPlanPanel,
    },
    {
      tab: '测试执行',
      key: TestType.TestRun,
      Component: TestRunPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ defaultActiveKey: TestType.TestDetail }}
      title="测试管理"
      tabs={tabs}
    />
  );
};

export default TestDetail;
