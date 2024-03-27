import React from 'react';

import PanelLayout from '@/components/business/PanelLayout';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import HistoryRUnPanel from './HistoryRunPanel';
import TestDetailPanel from './TestDetailPanel';
import TestPlanPanel from './TestPlanPanel';

const TestDetail: React.FC = () => {
  const { t } = useI18n();
  const tabs = [
    {
      tab: t('modules.panel.testDetail.detail'),
      key: TestType.Case,
      Component: TestDetailPanel,
    },
    {
      tab: t('common.testPlan'),
      key: TestType.Plan,
      Component: TestPlanPanel,
    },
    {
      tab: t('modules.panel.testDetail.historyRunPanel.runRecord'),
      key: TestType.Run,
      Component: HistoryRUnPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ defaultActiveKey: TestType.Case }}
      title={t('common.testManager')}
      tabs={tabs}
    />
  );
};

export default TestDetail;
