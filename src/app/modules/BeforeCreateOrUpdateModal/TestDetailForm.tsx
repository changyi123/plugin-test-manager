import React from 'react';
import { Input } from 'antd';
import { Step } from '@/lib/types/Test';
import TestStep from '@/components/business/TestStep';
import { getStepInitialData } from '@/components/business/TestStep/helper';
import RepositorySelectorField from '@/components/business/RepositorySelectorField';
import useI18n from '@/lib/hooks/useI18n';

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
  const saveValues = (values: Partial<ValueType>) => {
    valuesRef.current = {
      ...valuesRef.current,
      ...values,
    };
    onChange(valuesRef.current);
  };

  React.useEffect(() => {
    if (extraData?.repository && !valuesRef.current.repository) {
      saveValues({
        repository: extraData?.repository,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraData?.repository]);

  const repositorySelectedKeys = values?.repository ? [values.repository] : [];

  const handleRepositoryKeysSelect = repository => {
    saveValues({
      repository: repository?.[0] ?? null,
    });
  };

  return (
    <div className={cx('form')}>
      <h6 className={cx('field-label')}>{t('page.plan.testEntityList.repositoryGroup')}</h6>
      <RepositorySelectorField
        value={repositorySelectedKeys}
        onChange={handleRepositoryKeysSelect}
        className={cx('repository-selector')}
        workspaceId={extraData?.workspaceId}
      />

      <h6 className={cx('step-title', 'field-label')}>{t('common.precondition')}</h6>
      <div className={cx('precondition')}>
        <Input.TextArea
          maxLength={1000}
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder={t('common.preconditionPlaceholder')}
          defaultValue={values?.precondition}
          onBlur={e => saveValues({ precondition: e.target.value })}
          onChange={e => saveValues({ precondition: e.target.value })}
        />
      </div>
      <h6 className={cx('step-title', 'field-label')}>{t('common.testStep')}</h6>
      <TestStep
        steps={values?.steps ?? [getStepInitialData()]}
        onChange={steps => saveValues({ steps })}
      />
    </div>
  );
};

export default TestDetailForm;
