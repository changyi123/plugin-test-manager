import { useSDK } from '@projectproxima/plugin-sdk';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Steps } from 'antd';
import { TestType } from 'common/constant';
import React from 'react';

import { useGetPermissions } from '@/components/business/TestManagerProvider/hooks';
import { getPriorityOptions } from '@/lib/api/minder';
import { getWorkspaceByKey } from '@/lib/api/proxima';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';
import { getRepositoryTreeWithParentNode } from './lib';
import MinderEditor from './steps/MinderDraftEditor';
import Result from './steps/Result';
import XMindUpload from './steps/XMindUpload';
import { SharedState } from './type';

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
    useCanGoNextControlButtonDisabled: true,
  },
  {
    key: 'result',
    component: Result,
  },
];

const RootRepositoryId = 'root';

// 各组件间共享的状态
const useSharedState = () => {
  const [workspace, setWorkspace] = React.useState(null);
  const { t } = useI18n();
  const { context } = useSDK();
  const workspaceKey = context?.env?.WORKSPACE_KEY;
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
    canCreateTestCaseItem: false,
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
      redirectLink: searchState?.redirectLink,
    });
  }, [setPartialSharedState]);

  // TODO: 获取用例树
  React.useEffect(() => {
    if (workspaceKey) {
      Promise.all([
        getWorkspaceByKey(workspaceKey),
        getRepositoryTreeWithParentNode(workspaceKey, t),
      ]).then(([workspace, repositoryTree]) => {
        setWorkspace(workspace);
        setPartialSharedState({ workspaceKey, repositoryTree });
      });
    }
  }, [workspaceKey, setPartialSharedState, t]);

  // 获取创建权限
  const { getCreatePermission: getDisabledCreatePermission } = useGetPermissions(workspace);
  React.useEffect(() => {
    setPartialSharedState({ canCreateTestCaseItem: !getDisabledCreatePermission(TestType.Case) });
  }, [getDisabledCreatePermission, setPartialSharedState]);

  return [sharedState, setPartialSharedState] as const;
};

const XMindImport = () => {
  const { t } = useI18n();
  const nextStepButtonClickRef = React.useRef<any>();

  const [stepIndex, setStepIndex] = React.useState(0);
  const currentStep = ImportSteps[stepIndex];

  const [sharedState, setPartialSharedState] = useSharedState();

  // 下一步
  const handlerSaveButtonClick = useMemoizedFn(async () => {
    await nextStepButtonClickRef.current?.();
    sharedState.canGoNext && setStepIndex(step => step + 1);
    setPartialSharedState({ canGoNext: false });
  });

  React.useLayoutEffect(() => {
    const layoutElement = document.querySelector('[data-element-id="workspace.layout.content"]');
    const workspacePluginContainerDOM = layoutElement.children?.[0] ?? ({} as any);
    workspacePluginContainerDOM.style = 'padding: 0';
  }, []);

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
          nextStepButtonClickRef,
          onSharedStateChange: setPartialSharedState,
        })}
      </div>
    </div>
  );
};

export default XMindImport;
