import React from 'react';
import cx from './index.less';
import { message } from 'antd';
import { isEqual, pick } from 'lodash';
import { PlusOutlined } from '@/icons';
import { TestType } from '@/lib/constants';
import { getStepInitialData } from './helper';
import { getTestStepsByTestDetailId } from '@/lib/api/runs';

import StepList from './StepList';

import TestEntitySelectorModal, {
  ActionType as TestEntitySelectorActionType,
} from '@/components/business/TestEntitySelectorModal';

import { Step } from '@/lib/types/Test';
import { hasArrayItem } from '@/lib/utils/helper';
import useI18n from '@/lib/hooks/useI18n';

export type ActionType = {
  filter: (stepIds: string[]) => void;
};

type TestStepProps = {
  steps?: Step[];
  testDetailId?: string;
  canCallTest?: boolean;
  onChange?: (steps) => void;
  actionRef?: (action: ActionType) => void;
};

const TestStep: React.FC<TestStepProps> = ({
  onChange,
  actionRef,
  canCallTest,
  testDetailId,
  steps: stepsProps = [],
}) => {
  const { t } = useI18n();
  const isInitialStepRef = React.useRef(false);
  const testEntitySelectorRef = React.createRef<TestEntitySelectorActionType>();
  const [steps, _setSteps] = React.useState([]);

  const setSteps = React.useCallback(
    newSteps => {
      _setSteps(newSteps);
      // 向上级组件通信
      if (!isEqual(stepsProps, newSteps)) {
        // stepsCacheRef.current
        onChange?.(newSteps);
      }
    },
    [stepsProps, _setSteps, onChange],
  );

  const stepActions = React.useMemo(() => {
    return {
      copy({ index, id }) {
        const needCopiedStep = Object.assign(
          {},
          steps.find(step => step.id === id),
          pick(getStepInitialData(), ['id']),
        );

        const newSteps = Array.from(steps);
        newSteps.splice(index, 0, needCopiedStep);
        setSteps(newSteps);
      },

      delete(id) {
        const newSteps = Array.from(steps);
        newSteps.splice(
          steps.findIndex(step => step.id === id),
          1,
        );
        setSteps(newSteps);
      },

      update(values) {
        const updatedSteps = steps.map(step => Object.assign({}, step, values[step.id]));

        setSteps(updatedSteps);
      },

      add({ step, index } = {} as any) {
        if (!step) {
          step = getStepInitialData();
        }
        const newSteps = Array.from(steps);
        newSteps.splice(index ?? steps.length, 0, step);
        setSteps(newSteps);
      },

      swap({ sourceIndex, destinationIndex }) {
        const newSteps = Array.from(steps);
        const [movedStep] = newSteps.splice(sourceIndex, 1);
        newSteps.splice(destinationIndex, 0, movedStep);
        setSteps(newSteps);
      },
    };
  }, [setSteps, steps]);

  // 数据初始化
  React.useEffect(() => {
    if (!isInitialStepRef.current) {
      const hasStepsProp = hasArrayItem(stepsProps);
      if (hasStepsProp) {
        setSteps(stepsProps);
        isInitialStepRef.current = true;
      }
    }
  }, [setSteps, stepsProps, stepActions]);

  React.useImperativeHandle(actionRef, () => ({
    filter() {},
  }));

  // TODO: 继承的弹窗还有问题
  const openCallTestModal = async () => {
    const [callTestId] = await testEntitySelectorRef.current?.open();
    try {
      if (!callTestId) return;
      // 验证继承的测试用例是否又循环依赖
      await getTestStepsByTestDetailId(callTestId, testDetailId);
    } catch (err) {
      message.error(`${t('components.business.testStep.notInheritCase')}：${err.message}`);
      return;
    }

    const newSteps = Array.from(steps);
    // 继承测试用例放到最后
    newSteps.splice(steps.length, 0, getStepInitialData(callTestId));

    setSteps(newSteps);
  };

  return (
    <div>
      {canCallTest && (
        <TestEntitySelectorModal
          isSingleMode
          title={t('components.business.testStep.modelTitle')}
          testType={TestType.Case}
          actionRef={testEntitySelectorRef}
          // 继承测试用例不能继承自己
          ignoreTestEntityIds={[testDetailId]}
        />
      )}
      <StepList actions={stepActions} steps={steps} />
      <div className={cx('actions')}>
        <a onClick={() => stepActions.add()}>
          <PlusOutlined /> {t('components.business.testStep.addStep')}
        </a>
        {canCallTest ? (
          <a onClick={openCallTestModal}>{t('components.business.testStep.inheritCase')}</a>
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(TestStep);
