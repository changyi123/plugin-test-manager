import React from 'react';
import _ from 'lodash';
import type { StepRow } from './type';

export const NextStepFieldContext = React.createContext({
  saveFieldRef: _.noop,
  nextField: _.noop,
});

export const useNextStepFieldContext = () => React.useContext(NextStepFieldContext);

const StepFieldProvider: React.FC<{
  stepRowData: StepRow[];
  addStep: () => void;
  children: React.ReactNode;
}> = ({ children, stepRowData, addStep }) => {
  const stepFieldRef = React.useRef([]);
  const stepFieldsContextValue = React.useMemo(() => {
    // 获取最新的 stepField
    const stepFields = _.chain(stepRowData)
      .filter(step => step?.fields?.length > 0)
      .map(step => _.pick(step, ['id', 'fields']))
      .value();

    // 处理存量更新
    stepFieldRef.current = stepFields.map(step => {
      const prevStepData = stepFieldRef.current.find(({ id }) => step.id === id);
      return prevStepData || step;
    });

    return {
      saveFieldRef(stepId, key, ref) {
        if (stepFieldRef.current) {
          if (ref) {
            stepFieldRef.current = stepFieldRef.current.map(step => {
              if (step.id === stepId) {
                step.fields = step.fields.map(field => {
                  if (field.key === key) {
                    return Object.assign({}, field, { ref });
                  }
                  return field;
                });
              }
              return step;
            });
          }
        }
      },
      nextField(stepId, key) {
        const currentRowIndex = stepFieldRef.current.findIndex(step => step.id === stepId);
        if (currentRowIndex > -1) {
          const currentRowFields = stepFieldRef.current[currentRowIndex]?.fields ?? [];
          const currentFieldIndex = currentRowFields.findIndex(field => field.key === key);

          if (currentFieldIndex > -1) {
            const currentFieldRef = currentRowFields[currentFieldIndex]?.ref;
            let nextFieldRef = currentRowFields[currentFieldIndex + 1]?.ref;
            // 最后一条行最后一个步骤，先创建新的步骤，再重新执行 nextField
            if (
              currentRowIndex === stepFieldRef.current.length - 1 &&
              currentFieldIndex === currentRowFields.length - 1
            ) {
              addStep();
              setTimeout(() => {
                stepFieldsContextValue.nextField(stepId, key);
              }, 16);
              return;
            } else if (currentFieldIndex === currentRowFields.length - 1) {
              // 获取下一行第一个 step
              nextFieldRef = stepFieldRef.current[currentRowIndex + 1]?.fields[0]?.ref;
            }
            // 下一次事件循环执行 focus & blur
            setTimeout(() => {
              currentFieldRef?.blur?.();
              nextFieldRef?.focus?.();
            });
          }
        }
      },
    };
  }, [addStep, stepRowData]);

  return (
    <NextStepFieldContext.Provider value={stepFieldsContextValue}>
      {children}
    </NextStepFieldContext.Provider>
  );
};

export default React.memo(StepFieldProvider);
