import React from 'react';
import { TestType } from '@/lib/constants';
import TestDetailPanel from './TestDetailPanel';
import TestExecutionPanel from './TestExecutionPanel';
import PanelLayout, { alert } from '@/components/panel/PanelLayout';

const TestPlan = () => {
  React.useEffect(() => {
    alert({
      type: 'success',
      message: '创建成功',
    });
    alert({
      type: 'error',
      message: '创建失败',
    });
  }, []);
  const tabs = [
    {
      tab: '测试用例',
      key: TestType.TestDetail,
      Component: TestDetailPanel,
    },
    {
      tab: '测试执行',
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
