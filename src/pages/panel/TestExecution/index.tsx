import React from 'react';
import { TestType } from '@/lib/constants';
import PanelLayout from '@/components/panel/PanelLayout';
import TestDetailPanel from './TestDetailPanel';

const TestExecution = () => {
  const tabs = [
    {
      tab: '测试执行轮次',
      key: TestType.TestDetail,
      Component: TestDetailPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ destroyInactiveTabPane: true, defaultActiveKey: TestType.TestDetail }}
      title="测试执行轮次"
      tabs={tabs}
    />
  );
};

export default React.memo(TestExecution);
