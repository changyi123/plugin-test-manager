import React from 'react';
import { TestType } from '@/lib/constants';
import TestDetailPanel from './TestDetailPanel';
import TestExecutionPanel from './TestExecutionPanel';
import PanelLayout from '@/components/business/PanelLayout';

const TestPlan = () => {
  const tabs = [
    {
      tab: '测试用例',
      key: TestType.Case,
      Component: TestDetailPanel,
    },
    {
      tab: '测试执行任务',
      key: TestType.Execution,
      Component: TestExecutionPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ destroyInactiveTabPane: true, defaultActiveKey: TestType.Case }}
      title="测试计划"
      tabs={tabs}
    />
  );
};

export default React.memo(TestPlan);
