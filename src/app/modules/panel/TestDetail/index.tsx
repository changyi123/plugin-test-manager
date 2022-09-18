import React from 'react';
import { TestType } from '@/lib/constants';

import PanelLayout from '@/components/business/PanelLayout';

import TestDetailPanel from './TestDetailPanel';
import TestPlanPanel from './TestPlanPanel';

const TestDetail: React.FC = () => {
  const tabs = [
    {
      tab: '详情',
      key: TestType.Case,
      Component: TestDetailPanel,
    },
    {
      tab: '测试计划',
      key: TestType.Plan,
      Component: TestPlanPanel,
    },
  ];
  return (
    <PanelLayout tabsProps={{ defaultActiveKey: TestType.Case }} title="测试管理" tabs={tabs} />
  );
};

export default TestDetail;
