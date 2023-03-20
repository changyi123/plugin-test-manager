import React from 'react';

import { Result } from 'antd';
import TestPlan from './TestPlan';
import TestDetail from './TestDetail';
import TestExecution from './TestExecution';
import { getDevConfig } from '@/devEnv';
import { useSDK } from '@projectproxima/plugin-sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import { TestType, ENTITY_NOT_FOUND } from '@/lib/constants';
import TestManagerProvider from '@/components/business/TestManagerProvider';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

// 根据测试类型打开不同的测试 panel
const TestPanelComponents = {
  [TestType.Plan]: TestPlan,
  [TestType.Case]: TestDetail,
  [TestType.Execution]: TestExecution,
};

const TestPanel = () => {
  const { t } = useI18n();
  const { testEntity } = useTestConfig();

  const panelRenderNode = React.useMemo(() => {
    if ((testEntity as any) === ENTITY_NOT_FOUND)
      return (
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

    if (!testEntity) return null;
    const testType = testEntity.type ?? TestType.Case;

    const TestPanelComponent = TestPanelComponents[testType];

    return TestPanelComponent ? <TestPanelComponent /> : null;
  }, [testEntity, t]);

  return <div className={cx('test-panel')}>{panelRenderNode}</div>;
};

const TestPanelWrapper = () => {
  const { context } = useSDK();
  const itemId = context?.itemId ?? getDevConfig().itemId;
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;

  return (
    <TestManagerProvider workspaceKey={workspaceKey} itemId={itemId}>
      <TestPanel />
    </TestManagerProvider>
  );
};

export default React.memo(TestPanelWrapper);
