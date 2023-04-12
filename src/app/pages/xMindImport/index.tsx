import React from 'react';
import Result from './steps/Result';
import { Button, Steps } from 'antd';
import useI18n from '@/lib/hooks/useI18n';
import XMindUpload from './steps/XMindUpload';
import MinderEditor from './steps/MinderDraftEditor';
import { getPriorityOptions } from '@/lib/api/minder';
import { getRepositoryTreeWithParentNode } from './lib';
import { useRequest, useMemoizedFn, useEventEmitter } from 'ahooks';

import { SharedState } from './type';

import cx from './index.less';

const ImportSteps = [
  {
    key: 'upload',
    component: XMindUpload,
    buttonText: 'nextStep',
    useCanGoNextControlButtonDisabled: true,
  },
  {
    key: 'validate',
    component: MinderEditor,
    buttonText: 'save',
  },
  {
    key: 'result',
    component: Result,
    useCanGoNextControlButtonDisabled: true,
  },
];

const RootRepositoryId = 'root';

// 各组件间共享的状态
const useSharedState = () => {
  const { t } = useI18n();
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
    workspaceKey: '',
    priorityOptions,
    redirectLink: '',
    canGoNext: false,
    minderData: null,
    repositoryTree: null,
    submitMinderData: null,
    repositoryId: RootRepositoryId,
  });

  const setPartialSharedState = useMemoizedFn((state: Partial<SharedState>) => {
    setSharedState(originalState => ({
      ...originalState,
      ...state,
    }));
  });

  React.useEffect(() => {
    if (priorityOptions) {
      setPartialSharedState({ priorityOptions });
    }
  }, [priorityOptions, setPartialSharedState]);

  React.useEffect(() => {
    const searchState = {} as Record<string, string>;
    for (const [key, value] of new URLSearchParams(window.location.search).entries()) {
      searchState[key] = value;
    }
    setPartialSharedState({
      repositoryId: searchState.repositoryId ?? RootRepositoryId,
      workspaceKey: searchState?.workspaceKey,
      redirectLink: searchState?.redirectLink,
    });
  }, [setPartialSharedState]);

  // TODO: 获取用例树
  React.useEffect(() => {
    if (sharedState?.workspaceKey) {
      getRepositoryTreeWithParentNode(sharedState?.workspaceKey, t).then(repositoryTree => {
        setPartialSharedState({ repositoryTree });
      });
    }
  }, [sharedState?.workspaceKey, setPartialSharedState, t]);

  return [sharedState, setPartialSharedState] as const;
};

const XMindImport = () => {
  const { t } = useI18n();

  const [stepIndex, setStepIndex] = React.useState(0);
  const currentStep = ImportSteps[stepIndex];

  const [sharedState, setPartialSharedState] = useSharedState();
  const saveButtonEmitter = useEventEmitter<'userClick' | 'stepComponentTrigger'>();

  // 下一步
  const handlerSaveButtonClick = useMemoizedFn(() => {
    saveButtonEmitter.emit('userClick');
    sharedState.canGoNext && setStepIndex(step => step + 1);
    setPartialSharedState({ canGoNext: false });
  });

  saveButtonEmitter.useSubscription(type => {
    if (type === 'userClick') return;
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
        {ImportSteps[stepIndex].buttonText && (
          <Button
            disabled={
              ImportSteps[stepIndex].useCanGoNextControlButtonDisabled && !sharedState.canGoNext
            }
            type="primary"
            onClick={handlerSaveButtonClick}
          >
            {t(`page.xMindImport.button.${currentStep.buttonText}`)}
          </Button>
        )}
      </div>
      <div className={cx('step-content')}>
        {React.createElement(currentStep.component, {
          sharedState,
          saveButtonEmitter,
          onSharedStateChange: setPartialSharedState,
        })}
      </div>
    </div>
  );
};

export default XMindImport;
