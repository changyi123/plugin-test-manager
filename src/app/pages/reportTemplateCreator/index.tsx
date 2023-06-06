import { useMemoizedFn } from 'ahooks';
import { Button, Steps as AntdSteps } from 'antd';
import { useSetAtom } from 'jotai';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { testReportQuery } from '@/services/query';

import cx from './index.less';
import { LocationStoreHashKey } from './lib';
import BasicConfig from './steps/BasicConfig';
import DataSourceConfig from './steps/DataSourceConfig';
import TemplateConfig from './steps/TemplateConfig';
import { reportTemplateConnectLocation } from './store';

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

  const setReportTemplate = useSetAtom(reportTemplateConnectLocation);

  const [currentStep, setCurrentStep] = React.useState(2);
  const currentStepConfig = StepsConfig[currentStep];

  // 从 URL 中获取测试报告模板 ID
  const testReportId = location.hash.match(new RegExp(`${LocationStoreHashKey}=(.+)`))?.[1];

  const { data: testReportTemplateData } = testReportQuery.useTestReportByObjectId(testReportId);

  const goNextStep = useMemoizedFn(async () => {
    // 通知 Step 组件执行下一步

    try {
      await actionRef.current?.goNextButtonClick?.();
      setCurrentStep(step => step + 1);
    } catch (_err) {
      // do nothing
    }
  });

  React.useEffect(() => {
    if (testReportTemplateData) {
      setReportTemplate(testReportTemplateData);
    }
  }, [setReportTemplate, testReportTemplateData]);

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
              {scopedT('button.next')}
            </Button>
          )}
          {endOfStep && <Button type="primary">{scopedT('button.finish')}</Button>}
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
