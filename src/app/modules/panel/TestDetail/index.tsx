import React from 'react';
import { TestType } from '@/lib/constants';

import PanelLayout from '@/components/business/PanelLayout';

import TestDetailPanel from './TestDetailPanel';
import TestPlanPanel from './TestPlanPanel';
import useI18n from '@/lib/hooks/useI18n';

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
