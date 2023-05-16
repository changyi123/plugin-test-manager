import React from 'react';

import PanelLayout from '@/components/business/PanelLayout';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import TestDetailPanel from './TestDetailPanel';

const TestExecution = () => {
  const { t } = useI18n();
  const tabs = [
    {
      tab: t('common.testExecution'),
      key: TestType.Case,
      Component: TestDetailPanel,
    },
  ];
  return (
    <PanelLayout
      tabsProps={{ destroyInactiveTabPane: true, defaultActiveKey: TestType.Case }}
      title={t('common.testExecution')}
      tabs={tabs}
    />
  );
};

export default React.memo(TestExecution);
