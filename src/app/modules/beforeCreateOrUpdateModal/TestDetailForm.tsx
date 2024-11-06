import { useListener } from '@projectproxima/proxima-sdk-js';
import { Input } from 'antd';
import { pick } from 'lodash';
import React from 'react';

import RepositorySelectorField from '@/components/business/RepositorySelectorField';
import TestStep, { ActionType } from '@/components/business/TestStep';
import { getStepInitialData } from '@/components/business/TestStep/helper';
import { getAppEnv } from '@/lib/appEnv';
import { CREATE_ITEM_STORE_FIELD_KEY } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { Step } from '@/lib/types/Test';

import cx from './TestDetailForm.less';

export type ValueType = {
  repository: string | null;
  steps: Step[];
  precondition: string;
};

type TestDetailFormProps = {
  extraData?: Record<string, any>;
  values?: ValueType;
  onChange?: (values: ValueType) => void;
};

const TestDetailForm: React.FC<TestDetailFormProps> = ({ onChange, values, extraData }) => {
  const { t } = useI18n();
  const valuesRef = React.useRef({} as ValueType);
  const actionRef = React.useRef({} as ActionType);
  const saveValues = (values: Partial<ValueType>) => {
    valuesRef.current = {
      ...valuesRef.current,
      ...values,
    };
    onChange(valuesRef.current);
  };

  const enable = getAppEnv('CREATE_EXECUTION_DEFAULT_NAME_CONFIG')?.enable;

  useListener('createNextAndResetForm', ({ extraData }: any) => {
    if (extraData) {
      saveValues({
        ...pick(extraData[CREATE_ITEM_STORE_FIELD_KEY], ['repository']),
        steps: [getStepInitialData()],
        precondition: '',
      });
      actionRef.current.setSteps([getStepInitialData()]);
    }
  });

  React.useEffect(() => {
    if (extraData?.repository && !valuesRef.current.repository) {
      saveValues({
        repository: extraData?.repository,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraData?.repository]);

  React.useEffect(() => {
    window?.QiankunProps?.handleItemContextChange?.({});
  }, []);

  const repositorySelectedKeys = values?.repository ? [values.repository] : [];

  const handleRepositoryKeysSelect = repository => {
    saveValues({
      repository: repository?.[0] ?? null,
    });
  };

  return (
    <div className={cx('form')}>
      <h6 className={cx('field-label')}>
        {t('page.plan.testEntityList.repositoryGroup')}
        {enable && <span className={cx('required')}>*</span>}
      </h6>
      <RepositorySelectorField
        value={repositorySelectedKeys}
        onChange={handleRepositoryKeysSelect}
        className={cx('repository-selector')}
        workspaceId={extraData?.workspaceId}
      />

      <h6 className={cx('step-title', 'field-label')}>
        {t('common.precondition')}
        {enable && <span className={cx('required')}>*</span>}
      </h6>
      <div className={cx('precondition')}>
        <Input.TextArea
          maxLength={2000}
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder={t('common.preconditionPlaceholder')}
          value={values?.precondition}
          onBlur={e => saveValues({ precondition: e.target.value })}
          onChange={e => saveValues({ precondition: e.target.value })}
        />
      </div>
      <h6 className={cx('step-title', 'field-label')}>{t('common.testStep')}</h6>
      <TestStep
        hasRequiredTip={enable}
        steps={values?.steps ?? [getStepInitialData()]}
        onChange={steps => saveValues({ steps })}
        actionRef={actionRef}
      />
    </div>
  );
};

export default React.memo(TestDetailForm);
