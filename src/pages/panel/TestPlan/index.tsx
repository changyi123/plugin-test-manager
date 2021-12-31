import React from 'react';
import { TestType } from '@/lib/constants';
import TestDetailPanel from './TestDetailPanel';
import TestExecutionPanel from './TestExecutionPanel';
import PanelLayout from '@/components/panel/PanelLayout';

const TestPlan = () => {
  const tabs = [
    {
      tab: '测试用例',
      key: TestType.TestDetail,
      Component: TestDetailPanel,
    },
    {
      tab: '测试执行轮次',
      key: TestType.TestExecution,
      Component: TestExecutionPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ destroyInactiveTabPane: true, defaultActiveKey: TestType.TestDetail }}
      title="测试计划"
      tabs={tabs}
    />
  );
};

export default React.memo(TestPlan);
