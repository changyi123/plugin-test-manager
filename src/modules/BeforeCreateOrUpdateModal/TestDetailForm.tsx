import React from 'react';
import { Input } from 'antd';
import { TestEntity } from '@/lib/types/Test';
import TestStep from '@/components/business/TestStep';
import { getStepInitialData } from '@/components/business/TestStep/helper';
import RepositorySelectorField from '@/components/business/RepositorySelectorField';

import cx from './TestDetailForm.less';

export type ValueType = {
  repository: string | null;
  steps: TestEntity['detail']['steps'];
  precondition: TestEntity['detail']['precondition'];
};

type TestDetailFormProps = {
  extraData?: Record<string, any>;
  values?: ValueType;
  onChange?: (values: ValueType) => void;
};

const TestDetailForm: React.FC<TestDetailFormProps> = ({ onChange, values, extraData }) => {
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
      <h6 className={cx('field-label')}>所属模块</h6>
      <RepositorySelectorField
        value={repositorySelectedKeys}
        onChange={handleRepositoryKeysSelect}
        className={cx('repository-selector')}
        workspaceId={extraData?.workspaceId}
      />

      <h6 className={cx('step-title', 'field-label')}>前置条件</h6>
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
      <h6 className={cx('step-title', 'field-label')}>用例步骤</h6>
      <TestStep
        steps={values?.steps ?? [getStepInitialData()]}
        onChange={steps => saveValues({ steps })}
      />
    </div>
  );
};

export default TestDetailForm;
