import { useSDK } from '@giteeteam/plugin-sdk';
import { Result } from 'antd';
import React from 'react';

import TestManagerProvider from '@/components/business/TestManagerProvider';
import { getDevConfig } from '@/devEnv';
import { TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';
import TestCaseSet from './TestCaseSet';
import TestDetail from './TestDetail';
import TestExecution from './TestExecution';
import TestPlan from './TestPlan';

// 根据测试类型打开不同的测试 panel
const TestPanelComponents = {
  [TestType.Plan]: TestPlan,
  [TestType.Case]: TestDetail,
  [TestType.Execution]: TestExecution,
  [TestType.CaseSet]: TestCaseSet,
};

const TestPanel = () => {
  const { t } = useI18n();
  const { testEntity, baseLineItemId } = useTestConfig();

  const panelRenderNode = React.useMemo(() => {
    const testType = testEntity?.type ?? TestType.Case;
    const hiddenVersion = baseLineItemId && testType !== TestType.Case;
    console.info(testType, hiddenVersion, 'panelRenderNode');
    if (!testEntity || !testEntity?.type || hiddenVersion)
      return hiddenVersion ? (
        <Result className={cx('empty')} status="404" title={t('common.versionTip')} />
      ) : (
        <Result
          className={cx('empty')}
          status="404"
          title={t('modules.panel.resultTitle')}
          subTitle={
            <span>
              {t('modules.panel.resultSubTitle.0')}{' '}
              <span className={cx('breadcrumb')}>
                {t('modules.panel.resultSubTitle.1')} &gt; {t('modules.panel.resultSubTitle.2')}{' '}
                &gt; {t('modules.panel.resultSubTitle.3')}{' '}
              </span>
              {t('modules.panel.resultSubTitle.4')}
            </span>
          }
        ></Result>
      );

    const TestPanelComponent = TestPanelComponents[testType];

    return TestPanelComponent ? <TestPanelComponent /> : null;
  }, [testEntity, t, baseLineItemId]);

  return <div className={cx('test-panel')}>{panelRenderNode}</div>;
};

const TestPanelWrapper = () => {
  const { context } = useSDK();
  const itemId = context?.itemId ?? getDevConfig().itemId;
  const baseLineItemId = context?.baseLineItemId ?? getDevConfig().baseLineItemId;
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;

  return (
    <TestManagerProvider
      workspaceKey={workspaceKey}
      itemId={itemId}
      baseLineItemId={baseLineItemId}
    >
      <TestPanel />
    </TestManagerProvider>
  );
};

export default React.memo(TestPanelWrapper);
