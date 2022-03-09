import React from 'react';
import { Input } from '@osui/ui';
import { TestEntity } from '@/lib/types/Test';
import TestStep from '@/components/panel/TestStep';

import cx from './TestDetailForm.less';

export type ValueType = {
  steps: TestEntity['detail']['steps'];
  precondition: TestEntity['detail']['precondition'];
};

type TestDetailFormProps = {
  values?: ValueType;
  onChange?: (values: ValueType) => void;
};

const TestDetailForm: React.FC<TestDetailFormProps> = ({ onChange, values }) => {
  const valuesRef = React.useRef({} as ValueType);
  const saveValues = (values: Partial<ValueType>) => {
    valuesRef.current = {
      ...valuesRef.current,
      ...values,
    };
    onChange(valuesRef.current);
  };

  return (
    <div className={cx('form')}>
      <h6>前置条件</h6>
      <div className={cx('precondition')}>
        <Input.TextArea
          maxLength={1000}
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder="请输入测试用例前置条件"
          defaultValue={values?.precondition}
          onBlur={e => saveValues({ precondition: e.target.value })}
          onChange={e => saveValues({ precondition: e.target.value })}
        />
      </div>
      <h6 className={cx('step-title')}>用例步骤</h6>
      <TestStep
        controllable
        initialBlankStep
        steps={values?.steps ?? []}
        onChange={steps => saveValues({ steps })}
      />
    </div>
  );
};

export default TestDetailForm;
