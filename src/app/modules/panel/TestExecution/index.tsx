import React from 'react';
import { TestType } from '@/lib/constants';
import PanelLayout from '@/components/business/PanelLayout';
import TestDetailPanel from './TestDetailPanel';

const TestExecution = () => {
  const tabs = [
    {
      tab: '测试执行任务',
      key: TestType.Case,
      Component: TestDetailPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ destroyInactiveTabPane: true, defaultActiveKey: TestType.Case }}
      title="测试执行任务"
      tabs={tabs}
    />
  );
};

export default React.memo(TestExecution);
