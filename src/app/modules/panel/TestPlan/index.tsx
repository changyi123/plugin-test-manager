import React from 'react';
import { TestType } from '@/lib/constants';
import TestDetailPanel from './TestDetailPanel';
import TestExecutionPanel from './TestExecutionPanel';
import PanelLayout from '@/components/business/PanelLayout';
import useI18n from '@/lib/hooks/useI18n';

const TestPlan = () => {
  const { t } = useI18n();
  const tabs = [
    {
      tab: t('common.testCase'),
      key: TestType.Case,
      Component: TestDetailPanel,
    },
    {
      tab: t('common.testExecution'),
      key: TestType.Execution,
      Component: TestExecutionPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ destroyInactiveTabPane: true, defaultActiveKey: TestType.Case }}
      title={t('common.testPlan')}
      tabs={tabs}
    />
  );
};

export default React.memo(TestPlan);
