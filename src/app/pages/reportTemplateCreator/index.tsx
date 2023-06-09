import { useMemoizedFn } from 'ahooks';
import { Button, Steps as AntdSteps } from 'antd';
import { useAtomValue, useSetAtom } from 'jotai';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useLayoutHeight } from '@/components/common/PageLayout/hook';
import { testReportQuery } from '@/services/query';

import cx from './index.less';
import { LocationStoreHashKey } from './lib';
import BasicConfig from './steps/BasicConfig';
import DataSourceConfig from './steps/DataSourceConfig';
import TemplateConfig from './steps/TemplateConfig';
import { stageAtom, testReportWitchConnectWithLocationAtom } from './store';

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

  const setTestReportTemplateData = useSetAtom(testReportWitchConnectWithLocationAtom);
  const stage = useAtomValue(stageAtom);

  const [nextButtonLoading, setNextButtonLoading] = React.useState(false);

  // 获取页面高度
  const height = useLayoutHeight();

  const [currentStep, setCurrentStep] = React.useState(0);
  const currentStepConfig = StepsConfig[currentStep];

  // 从 URL 中获取测试报告模板 ID
  const testReportId = location.search.match(new RegExp(`${LocationStoreHashKey}=(.+)`))?.[1];

  const { data: testReportTemplateData } = testReportQuery.useTestReportByObjectId(testReportId);

  const endOfStep = currentStep === StepsConfig.length - 1;

  const goNextStep = useMemoizedFn(async () => {
    // 通知 Step 组件执行下一步

    try {
      setNextButtonLoading(true);
      await actionRef.current?.goNextButtonClick?.();
      if (!endOfStep) {
        setCurrentStep(step => step + 1);
      } else {
        // TODO: 跳转回列表页面
      }
    } catch (_err) {
      // do nothing
    } finally {
      setNextButtonLoading(false);
    }
  });

  React.useEffect(() => {
    if (testReportTemplateData) {
      setTestReportTemplateData(testReportTemplateData);
    }
  }, [setTestReportTemplateData, testReportTemplateData]);

  return (
    <div className={cx('container')} style={{ height }}>
      <div className={cx('header')}>
        <h3>{scopedT(!testReportId || stage === 'create' ? 'creatorTitle' : 'editorTitle')}</h3>
        <div className={cx('step-container')}>
          <AntdSteps
            current={currentStep}
            items={StepsConfig.map(step => ({
              title: scopedT(step.title),
            }))}
          />
        </div>
        <div className={cx('action')}>
          <Button loading={nextButtonLoading} type="primary" onClick={goNextStep}>
            {scopedT(`button.${endOfStep ? 'finish' : 'next'}`)}
          </Button>
        </div>
      </div>
      <div className={cx('content')}>
        {React.createElement(currentStepConfig.component, {
          actionRef,
        } as any)}
      </div>
    </div>
  );
};

export default React.memo(TestReportTemplate);
