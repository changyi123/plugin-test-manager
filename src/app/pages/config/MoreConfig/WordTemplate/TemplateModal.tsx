/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import UploadFile from '@/components/common/UploadFile';
import useI18n from '@/lib/hooks/useI18n';
import { WordTemplateInterface } from './index';

import cx from './index.less';

interface ModalProps {
  visible: boolean;
  handleCancel: () => void;
  handleSubmit: (value: WordTemplateInterface) => void;
  templateData: WordTemplateInterface;
  title: string;
}

const TemplateModal: React.FC<ModalProps> = ({
  visible,
  handleCancel,
  handleSubmit,
  templateData,
}) => {
  const { t } = useI18n();
  const [form] = Form.useForm();
  useEffect(() => {
    if (templateData) {
      // TODO:schema数据类型的问题
      if (templateData.file && typeof templateData.file === 'string') {
        templateData.file = JSON.parse(templateData.file);
      }
      form.setFieldsValue(templateData);
    }
  }, [form, templateData]);
  const handleOk = async () => {
    const values = await form.validateFields();
    handleSubmit(values);
  };
  const onFinish = () => {};

  // 上传字段适配
  const UploadFieldAdapterProps = {
    getValueFromEvent: files => {
      const file = files[0];
      if (!file) return null;
      return {
        ...file,
        url: file.href,
      };
    },
    getValueProps: file => {
      const fileList = file
        ? [
            {
              ...file,
              href: file.url,
            },
          ]
        : [];

      return {
        value: fileList,
      };
    },
  };

  return (
    <Modal
      title={t('page.config.wordTemplate.uploadTemplate')}
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
      maskClosable={false}
      className={cx('word_template_modal')}
    >
      <Form
        name="basic"
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 20 }}
        onFinish={onFinish}
        form={form}
      >
        <Form.Item
          label={t('page.config.wordTemplate.templateName')}
          name="name"
          rules={[{ required: true, message: t('page.config.wordTemplate.ruleTips') }]}
        >
          <Input placeholder={t('page.config.wordTemplate.ruleTips')} />
        </Form.Item>

        {/* <Form.Item label="应用空间" name="dataSet">
          <Select placeholder="请选择" disabled />
        </Form.Item>

        <Form.Item label="数据集" name="workspace">
          <Select placeholder="请选择" disabled />
        </Form.Item> */}

        <Form.Item
          name="file"
          label={t('page.config.wordTemplate.file')}
          {...UploadFieldAdapterProps}
          rules={[{ required: true, message: t('page.config.wordTemplate.uploadFileTips') }]}
        >
          <UploadFile
            uploadProps={{
              // 只支持 doc 和 docx 类型的文件上传
              accept: '.doc,.docx',
            }}
            maxCount={1}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TemplateModal;
