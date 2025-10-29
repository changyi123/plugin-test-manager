import React, { useMemo } from 'react';

import PanelLayout from '@/components/business/PanelLayout';
import { featureFlags } from '@/lib/appEnv';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import TestCaseSetPanel from '@/modules/panel/TestDetail/TestCaseSetPanel';

import AutomationInfoPanel from './AutomationInfoPanel';
import HistoryRUnPanel from './HistoryRunPanel';
import TestDefect from './TestDefect';
import TestDetailPanel from './TestDetailPanel';
import TestPlanPanel from './TestPlanPanel';

const TestDetail: React.FC = () => {
  const { t } = useI18n();
  const { baseLineItemId, generalSetting, testEntity } = useTestConfig();

  // 检查是否有自动化信息
  const hasAutomationInfo = useMemo(() => {
    console.log('[TestDetail] 检查自动化信息, testEntity:', testEntity);
    
    const getFieldValue = (fieldName: string) => {
      // 优先使用带前缀的字段名，这是API返回的格式
      return (
        testEntity?.values?.[`r_test_manager_${fieldName}`] ||
        testEntity?.values?.[fieldName] ||
        testEntity?.[`r_test_manager_${fieldName}`] ||
        testEntity?.[fieldName]
      );
    };

    const automationInfo = {
      testId: getFieldValue('atm_test_id'),
      className: getFieldValue('atm_class_name'),
      methodName: getFieldValue('atm_method_name'),
    };
    
    const hasInfo = !!(
      automationInfo.testId ||
      (automationInfo.className && automationInfo.methodName)
    );
    
    console.log('[TestDetail] automationInfo:', automationInfo);
    console.log('[TestDetail] hasAutomationInfo:', hasInfo);
    
    return hasInfo;
  }, [testEntity]);

  const tabs = useMemo(() => {
    const tabList = baseLineItemId
      ? [
          !generalSetting?.caseDetailExtra && {
            tab: t('modules.panel.testDetail.detail'),
            key: TestType.Case,
            Component: TestDetailPanel,
          },
        ]
      : [
          !generalSetting?.caseDetailExtra && {
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
          featureFlags('ENABLE_TEST_CASE_SET') && {
            tab: t('modules.panel.testDetail.historyRunPanel.testCaseSet'),
            key: TestType.CaseSet,
            Component: TestCaseSetPanel,
          },
          {
            tab: t('common.testDefect'),
            key: TestType.Defect,
            Component: TestDefect,
          },
          hasAutomationInfo && {
            tab: '单元测试信息',
            key: TestType.Automation,
            Component: AutomationInfoPanel,
          },
        ];

    return tabList.filter(Boolean);
  }, [baseLineItemId, generalSetting, hasAutomationInfo, t]);
  return (
    <PanelLayout
      tabsProps={{ defaultActiveKey: TestType.Case }}
      title={t('common.testManager')}
      tabs={tabs}
    />
  );
};

export default TestDetail;
