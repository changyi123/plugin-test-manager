import { Formik } from 'formik';
import { Input, InputNumber, Modal, Radio } from 'insight';
import { addErrorMessage, FormField } from 'proxima-sdk/components/Components/Common';
import { useI18n } from 'proxima-sdk/hooks/Hooks';
import { FormError } from 'proxima-sdk/schema/types/error';
import React, { useRef } from 'react';

import { FormulaModalProps } from '../lib/type';
import { isValidFormulaName } from '../lib/util';
import cx from './Option.less';

const { TextArea } = Input;

const FormulaModal: React.FC<FormulaModalProps> = ({
  visible,
  onCancel,
  handleSubmit,
  formulasName,
  initialValues,
  isEdit,
}) => {
  const i18n = useI18n();

  const form = useRef(null);

  const validate = async value => {
    const errors = {} as FormError;
    if (!value.name?.trim()) {
      errors.name = addErrorMessage(errors.name, i18n.t('reportPlugin.basicTableChart.option.errorMsg.nameEmpty'));
    } else if (value.name.length > 20) {
      errors.name = addErrorMessage(errors.name, i18n.t('reportPlugin.basicTableChart.option.errorMsg.nameLength'));
    } else if (!isValidFormulaName(value.name)) {
      errors.name = addErrorMessage(errors.name, i18n.t('reportPlugin.basicTableChart.option.errorMsg.nameChar'));
    } else if (formulasName.includes(value.name) && !isEdit) {
      errors.name = addErrorMessage(errors.name, i18n.t('reportPlugin.basicTableChart.option.errorMsg.nameDuplicate'));
    }
    if (!value.formula?.trim()) {
      errors.formula = addErrorMessage(
        errors.formula,
        i18n.t('reportPlugin.basicTableChart.option.errorMsg.formulaEmpty'),
      );
    }
    return errors;
  };

  return (
    <Formik innerRef={form} onSubmit={handleSubmit} initialValues={initialValues} validate={validate}>
      {({ handleSubmit }) => (
        <Modal
          title={i18n.t('reportPlugin.basicTableChart.modal.title')}
          width={560}
          visible={visible}
          onOk={() => handleSubmit()}
          onCancel={onCancel}
          okText={i18n.t('reportPlugin.basicTableChart.modal.okText')}
          cancelText={i18n.t('reportPlugin.basicTableChart.modal.cancelText')}
        >
          <FormField label={i18n.t('reportPlugin.basicTableChart.modal.name')} name="name" required>
            {({ field }) => <Input {...field} />}
          </FormField>
          <FormField label={i18n.t('reportPlugin.basicTableChart.modal.formula')} name="formula" required>
            {({ field }) => (
              <TextArea
                {...field}
                rows={5}
                placeholder={i18n.t('reportPlugin.basicTableChart.modal.formulaPlaceholder')}
              />
            )}
          </FormField>
          <FormField label={i18n.t('reportPlugin.basicTableChart.modal.type')} name="type">
            {({ field }) => (
              <Radio.Group {...field}>
                <Radio value="number">{i18n.t('reportPlugin.basicTableChart.modal.typeNumber')}</Radio>
                <Radio value="percentage">{i18n.t('reportPlugin.basicTableChart.modal.typePercentage')}</Radio>
              </Radio.Group>
            )}
          </FormField>
          <FormField label={i18n.t('reportPlugin.basicTableChart.modal.precision')} name="precision">
            {({ field }) => (
              <InputNumber
                className={cx('formulas-precision')}
                {...field}
                precision={0}
                placeholder={i18n.t('reportPlugin.basicTableChart.modal.precisionPlaceholder')}
              />
            )}
          </FormField>
        </Modal>
      )}
    </Formik>
  );
};

export default FormulaModal;
