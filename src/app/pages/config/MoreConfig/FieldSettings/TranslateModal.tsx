import { Form, Input, message, Modal, Select, Spin } from 'antd';
import { pick } from 'lodash-es';
import React, { useEffect, useMemo, useState } from 'react';

import useI18n from '@/lib/hooks/useI18n';
import { Translation } from '@/services/models';

type TranslateModalProps<T = any> = {
  fieldType: string;
  fieldData: T;
  visible?: boolean;
  onCancel: () => void;
};

const contentLanguageMap = { zh: 'zh-CN', en: 'en-US', ru: 'ru-RU' };

const fieldKey = ['objectId', 'transName', 'transDesc'];
const { Item: FormItem } = Form;
const { TextArea } = Input;

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 5 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
  },
};

const fetchTranslation = async ({ fieldType, fieldId, locale }) => {
  const result = await new Parse.Query(Translation)
    .equalTo('entityName', fieldType)
    .equalTo('entityId', fieldId)
    .equalTo('locale', locale)
    .find({ json: true } as Parse.Query.FindOptions);
  return result;
};

const useTranslation = ({ fieldType, fieldId, locale }) => {
  const [translate, setTranslate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      if (locale) {
        try {
          setLoading(true);
          const result = await fetchTranslation({ fieldType, fieldId, locale });
          if (result?.length) {
            setTranslate(result[0]);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetch();
  }, [fieldType, fieldId, locale]);

  return {
    translate,
    loading,
  };
};

const TranslateModal: React.FC<TranslateModalProps> = ({
  fieldData,
  fieldType,
  visible,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const { t } = useI18n();

  const [selectedLocale, setSelect] = useState(undefined);
  const [submitting, setSubmit] = useState(false);
  const { translate, loading } = useTranslation({
    fieldId: fieldData.objectId,
    fieldType,
    locale: selectedLocale,
  });
  const options = useMemo(
    () =>
      Object.values(contentLanguageMap).map(lang => ({
        label: t(`common.locale.${lang}`),
        value: lang,
      })),
    [t],
  );

  const handleLocaleChange = value => {
    setSelect(value);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const values = await form.validateFields();
    try {
      setSubmit(true);
      const translation = new Translation({
        entityName: fieldType,
        entityId: fieldData.objectId,
        ...values,
      });
      await translation.save();
      message.success(t('common.saveSuccess'));
      onCancel();
    } catch (error) {
      message.error(error?.message);
    } finally {
      setSubmit(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  // 选择语言重置其他选项
  useEffect(() => {
    form.resetFields(fieldKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocale]);

  // 选择完语言填充数据
  useEffect(() => {
    if (translate) {
      form.setFieldsValue(pick(translate, fieldKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translate]);

  return (
    <Modal
      title={t('translationTitle', { name: fieldData?.name })}
      open={visible}
      destroyOnClose
      confirmLoading={submitting}
      onOk={handleSubmit}
      onCancel={handleCancel}
    >
      <Spin spinning={loading}>
        <Form {...formItemLayout} form={form}>
          <fieldset disabled={submitting}>
            <FormItem label="ObjectId" name="objectId" hidden>
              <Input />
            </FormItem>
            <FormItem label={t('common.language')} name="locale" rules={[{ required: true }]}>
              <Select options={options} onChange={handleLocaleChange} />
            </FormItem>
            <FormItem label={t('common.name')} name="transName" rules={[{ required: true }]}>
              <Input />
            </FormItem>
            <FormItem label={t('common.description')} name="transDesc" rules={[{ required: true }]}>
              <TextArea />
            </FormItem>
          </fieldset>
        </Form>
      </Spin>
    </Modal>
  );
};

export default TranslateModal;
