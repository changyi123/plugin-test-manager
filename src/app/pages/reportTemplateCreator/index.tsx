import { useMemoizedFn } from 'ahooks';
import { Button, Steps as AntdSteps } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import cx from './index.less';
import BasicConfig from './steps/BasicConfig';
import DataSourceConfig from './steps/DataSourceConfig';
import TemplateConfig from './steps/TemplateConfig';

export type ActionRefType = {
  goNextButtonClick?: () => Promise<void>;
};

const StepsConfig = [
  {
    key: 'basic',
    title: 'steps.basic',
    component: BasicConfig,
  },
  {
    key: 'template',
    title: 'steps.template',
    component: TemplateConfig,
  },
  {
    key: 'dataSource',
    title: 'steps.dataSource',
    component: DataSourceConfig,
  },
] as const;

// 测试报告模板
const TestReportTemplate: React.FC = () => {
  const actionRef = React.useRef<ActionRefType>();
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator',
  });

  const [currentStep, setCurrentStep] = React.useState(2);
  const currentStepConfig = StepsConfig[currentStep];

  const goNextStep = useMemoizedFn(async () => {
    // 通知 Step 组件执行下一步
    await actionRef.current?.goNextButtonClick?.();
    setCurrentStep(step => step + 1);
  });

  const endOfStep = currentStep === StepsConfig.length - 1;

  return (
    <div>
      <div className={cx('header')}>
        <h3>{scopedT('title')}</h3>
        <div className={cx('step-container')}>
          <AntdSteps
            current={currentStep}
            items={StepsConfig.map(step => ({
              title: scopedT(step.title),
            }))}
          ></AntdSteps>
        </div>
        <div className={cx('action')}>
          {!endOfStep && (
            <Button type="primary" onClick={goNextStep}>
              {scopedT('buttons.next')}
            </Button>
          )}
          {endOfStep && <Button type="primary">{scopedT('buttons.finish')}</Button>}
        </div>
      </div>
      <div>
        {React.createElement(currentStepConfig.component, {
          actionRef,
        } as any)}
      </div>
    </div>
  );
};

export default React.memo(TestReportTemplate);
