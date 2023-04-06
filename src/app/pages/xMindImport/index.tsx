import React from 'react';
import { Button, Steps } from 'antd';
import useI18n from '@/lib/hooks/useI18n';
import XMindUpload from './steps/XMindUpload';
import MinderEditor from './steps/MinderDraftEditor';
import { getPriorityOptions } from '@/lib/api/minder';
import { getRepositoryTreeWithParentNode } from './lib';
import { useRequest, useMemoizedFn, useLocalStorageState } from 'ahooks';

import { SharedState } from './type';

import cx from './index.less';

const ImportSteps = [
  {
    key: 'upload',
    component: XMindUpload,
    buttonText: 'nextStep',
  },
  {
    key: 'validate',
    component: MinderEditor,
    buttonText: 'save',
  },
];

// 各组件间共享的状态
const useSharedState = () => {
  const { data: priorityOptions } = useRequest(
    async () => {
      const options = await getPriorityOptions();
      return options;
    },
    {
      staleTime: -1,
    },
  );

  const [sharedState, setSharedState] = React.useState<SharedState>({
    priorityOptions,
    redirectLink: '',
    canGoNext: false,
    minderData: null,
    repositoryTree: null,
    repositoryId: 'root',
  });

  const setPartialSharedState = useMemoizedFn((state: Partial<SharedState>) => {
    setSharedState(originalState => ({
      ...originalState,
      ...state,
    }));
  });

  const [importState] = useLocalStorageState('xmind-import-state');
  // TODO: 获取用例树
  React.useEffect(() => {
    if (importState?.workspaceKey) {
      getRepositoryTreeWithParentNode(importState?.workspaceKey).then(repositoryTree => {
        setPartialSharedState({ repositoryTree });
      });
    }
  }, [importState?.workspaceKey, setPartialSharedState]);

  React.useEffect(() => {
    setPartialSharedState({ repositoryId: importState.repositoryId });
  }, [importState?.repositoryId, setPartialSharedState]);

  return [sharedState, setPartialSharedState] as const;
};

const XMindImport = () => {
  const { t } = useI18n();

  const [stepIndex, setStepIndex] = React.useState(0);
  const currentStep = ImportSteps[stepIndex];

  const [sharedState, setPartialSharedState] = useSharedState();

  // 下一步
  const nextStep = useMemoizedFn(() => {
    sharedState.canGoNext && setStepIndex(step => step + 1);
    setPartialSharedState({ canGoNext: false });
  });

  return (
    <div className={cx('container')}>
      <div className={cx('top')}>
        <h3>{t('page.xMindImport.title')}</h3>
        <Steps className={cx('step')} current={stepIndex}>
          {ImportSteps.map(step => (
            <Steps.Step key={step.key} title={t(`page.xMindImport.step.${step.key}`)} />
          ))}
        </Steps>
        <Button disabled={!sharedState.canGoNext} type="primary" onClick={nextStep}>
          {t(`page.xMindImport.button.${currentStep.buttonText}`)}
        </Button>
      </div>
      <div className={cx('step-content')}>
        {React.createElement(currentStep.component, {
          sharedState,
          onSharedStateChange: setPartialSharedState,
        })}
      </div>
    </div>
  );
};

export default XMindImport;
