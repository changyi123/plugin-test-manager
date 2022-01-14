import React from 'react';

import { Result } from '@osui/ui';
import TestPlan from './TestPlan';
import TestDetail from './TestDetail';
import TestExecution from './TestExecution';
import { TestType } from '@/lib/constants';
import { getDevConfig } from '@/devEnv';
import { useSDK } from '@projectproxima/plugin-sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import TestManagerProvider from '@/components/common/TestManagerProvider';

import cx from './index.less';

// 根据测试类型打开不同的测试 panel
const TestPanelComponents = {
  [TestType.TestPlan]: TestPlan,
  [TestType.TestDetail]: TestDetail,
  [TestType.TestExecution]: TestExecution,
};

const TestPanel = () => {
  const { testEntity } = useTestConfig();

  const panelRenderNode = React.useMemo(() => {
    if (!testEntity)
      return (
        <Result
          className={cx('empty')}
          status="404"
          title="当前事项类型不存在测试管理事项类型关联配置中"
          subTitle={
            <span>
              请前往 <span className={cx('breadcrumb')}>系统设置 &gt; 插件 &gt; 测试管理配置 </span>
              页面 ，选择事项类型关联配置进行配置
            </span>
          }
        ></Result>
      );
    console.info('testEntity', testEntity.toJSON());
    const testType = testEntity.get('type');

    const TestPanelComponent = TestPanelComponents[testType];

    return TestPanelComponent ? <TestPanelComponent /> : null;
  }, [testEntity]);

  return <div className={cx('test-panel')}>{panelRenderNode}</div>;
};

const TestPanelPage = () => {
  const { context } = useSDK();
  const itemId = context?.itemId ?? getDevConfig().itemId;

  return (
    <TestManagerProvider itemId={itemId}>
      <TestPanel />
    </TestManagerProvider>
  );
};

export default React.memo(TestPanelPage);
