import { Input } from 'antd';
import React, { useEffect, useState } from 'react';

import TestStep from '@/components/business/TestStep';
import { getStepInitialData } from '@/components/business/TestStep/helper';
import { updateTestEntity } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import { Step } from '@/lib/types/Test';

import cx from './TestDetailForm.less';

export type ValueType = {
  steps: Step[];
  precondition: string;
};

type TestDetailFormProps = {
  values?: ValueType;
  objectId?: string;
};

const TableCellTestDetailForm: React.FC<TestDetailFormProps> = ({ values, objectId }) => {
  const { t } = useI18n();
  const [textArea, setTextArea] = useState<string>();
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    const { steps: _values, precondition } = values || {};
    setSteps(_values);
    setTextArea(precondition);
  }, [values]);

  const onChange = async v => {
    await updateTestEntity([
      {
        objectId: objectId,
        detail: v,
      },
    ]);
  };
  return (
    <div className={cx('form')}>
      <div className={cx('precondition')}>
        <span className={cx('precondition-text')}>{t('common.precondition')}</span>
        <Input.TextArea
          maxLength={2000}
          autoSize={{ minRows: 2, maxRows: 3 }}
          // placeholder={t('common.precondition')}
          value={textArea}
          onChange={e => setTextArea(e.target.value)}
          onBlur={e => {
            onChange({
              steps: steps,
              precondition: e.target.value,
            });
          }}
        />
      </div>
      <h6 className={cx('step-title', 'field-label')}>{t('common.testStep')}</h6>
      <TestStep
        canCallTest
        steps={steps ?? [getStepInitialData()]}
        onChange={_steps => {
          setSteps(_steps);
          onChange({
            steps: _steps,
            precondition: textArea,
          });
        }}
      />
    </div>
  );
};

export default React.memo(TableCellTestDetailForm);
