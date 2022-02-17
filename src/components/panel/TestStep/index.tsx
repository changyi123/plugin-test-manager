import React from 'react';
import cx from './index.less';
import { message } from '@osui/ui';
import { useDebounceFn } from 'ahooks';
import { isEqual, pick } from 'lodash';
import { PlusOutlined } from '@/icons';
import { TestType } from '@/lib/constants';
import { getStepInitialData } from './helper';
import { getTestStepsByTestDetailId } from '@/lib/api/runs';

import StepList from './StepList';

import TestEntitySelectorModal, {
  ActionType as TestEntitySelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';

import { Step } from '@/lib/types/Test';

export type ActionType = {
  filter: (stepIds: string[]) => void;
};

type TestStepProps = {
  steps: Step[];
  testDetailId?: string;
  canCallTest?: boolean;
  onChange?: (step) => void;
  actionRef?: (action: ActionType) => void;
};

const TestStep: React.FC<TestStepProps> = ({
  onChange,
  actionRef,
  canCallTest,
  testDetailId,
  steps: stepsProps,
}) => {
  // 缓存首次加载状态
  const stepsCacheRef = React.useRef([]);
  const testEntitySelectorRef = React.createRef<TestEntitySelectorActionType>();
  const [steps, _setSteps] = React.useState(stepsProps);
  const { run: debouncedOnChange } = useDebounceFn(onChange, {
    wait: 800,
  });

  const setSteps = React.useCallback(
    (newSteps, isInitial = false) => {
      _setSteps(newSteps);
      // 初始化对 step 数据进行缓存
      if (isInitial) {
        stepsCacheRef.current = newSteps;
      }
      // 向上级组件通信
      if (!isEqual(stepsProps, newSteps)) {
        // stepsCacheRef.current
        debouncedOnChange?.(newSteps);
      }
    },
    [stepsProps, _setSteps, debouncedOnChange],
  );

  React.useEffect(() => {
    // 初始化时更新
    if (!steps.length && !isEqual(stepsProps, steps)) {
      setSteps(stepsProps, true);
    }
  }, [setSteps, steps, stepsProps]);

  React.useImperativeHandle(actionRef, () => ({
    filter() {},
  }));

  const openCallTestModal = async () => {
    const callTestId = await testEntitySelectorRef.current?.open();
    try {
      // 验证继承的测试用例是否又循环依赖
      await getTestStepsByTestDetailId(callTestId, testDetailId);
    } catch (err) {
      message.error(`不能继承该测试用例：${err.message}`);
      return;
    }

    const newSteps = Array.from(steps);
    // 继承测试用例放到最后
    newSteps.splice(steps.length - 1, 0, getStepInitialData(callTestId));

    setSteps(newSteps);
  };

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

  return (
    <div>
      <TestEntitySelectorModal
        isSingleMode
        title="请选择继承测试用例"
        testType={TestType.TestDetail}
        actionRef={testEntitySelectorRef}
        // 继承测试用例不能继承自己
        ignoreTestEntityIds={[testDetailId]}
      />
      <StepList actions={stepActions} steps={steps} />
      <div className={cx('actions')}>
        <a onClick={() => stepActions.add()}>
          <PlusOutlined /> 添加步骤
        </a>
        {canCallTest ? <a onClick={openCallTestModal}>继承测试用例</a> : null}
      </div>
    </div>
  );
};

export default React.memo(TestStep);
