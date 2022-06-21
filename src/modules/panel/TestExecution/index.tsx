import React from 'react';
import { TestType } from '@/lib/constants';
import PanelLayout from '@/components/business/PanelLayout';
import TestDetailPanel from './TestDetailPanel';

const TestExecution = () => {
  const tabs = [
    {
      tab: '测试执行任务',
      key: TestType.TestDetail,
      Component: TestDetailPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ destroyInactiveTabPane: true, defaultActiveKey: TestType.TestDetail }}
      title="测试执行任务"
      tabs={tabs}
    />
  );
};

export default React.memo(TestExecution);
