import { Table } from 'antd';
import React, { useEffect, useState } from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { Step } from '@/lib/types/Test';
import { getEditorOrStringText } from '@/lib/utils/helper';

import cx from './TestDetailForm.less';

export type ValueType = {
  steps: Step[];
  precondition: string;
};

type TestDetailFormProps = {
  values?: ValueType;
  extraElement?: React.ReactElement;
};

const TableCellTestDetailFormReadOnly: React.FC<TestDetailFormProps> = ({
  values,
  extraElement,
}) => {
  const { t } = useI18n();
  const [textArea, setTextArea] = useState<string>();
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    const { steps: _values, precondition } = values || {};
    setSteps(_values);
    setTextArea(precondition);
  }, [values]);

  const columns = [
    { title: '#', width: 20, dataIndex: 'index', render: (value, record, index) => index + 1 },
    {
      title: t('components.business.testStep.stepField.0'),
      dataIndex: 'action',
      render: value => getEditorOrStringText(value) || '-',
    },
    {
      title: t('components.business.testStep.stepField.1'),
      dataIndex: 'result',
      render: value => getEditorOrStringText(value) || '-',
    },
    {
      title: t('components.business.testStep.stepField.2'),
      dataIndex: 'data',
      render: value => getEditorOrStringText(value) || '-',
    },
  ];
  return (
    <div className={cx('form')}>
      <div className={cx('precondition-readonly')}>
        <span className={cx('step-title', 'field-label')} style={{ fontWeight: 500 }}>
          {t('common.precondition')}:{' '}
        </span>
        <span className={cx('precondition-readonly-text')}>{textArea || t('common.nothing')}</span>
      </div>
      <div className={cx('step-title-wrap')}>
        <h6 className={cx('step-title', 'field-label')}>{t('common.testStep')}</h6>
        {extraElement}
      </div>
      <Table columns={columns} dataSource={steps || []} pagination={false} size="small" />
    </div>
  );
};

export default React.memo(TableCellTestDetailFormReadOnly);
