import React, { useEffect } from 'react';

import { Modal, Form, Input, Select } from 'antd';
import UploadFile from '@/components/common/UploadFile';

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
  const [form] = Form.useForm();
  useEffect(() => {
    if (templateData) {
      // TODO:schema数据类型的问题
      if (templateData.fileUrl && typeof templateData.fileUrl === 'string') {
        templateData.fileUrl = JSON.parse(templateData.fileUrl);
      }
      form.setFieldsValue(templateData);
    }
  }, [form, templateData]);
  const handleOk = async () => {
    const values = await form.validateFields();
    handleSubmit(values);
  };
  const onFinish = () => {};
  return (
    <Modal
      title="上传测试模板"
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
          label="模板名称"
          name="name"
          rules={[{ required: true, message: '请输入模板名称!' }]}
        >
          <Input placeholder="请输入模板名称" />
        </Form.Item>

        <Form.Item label="应用空间" name="dataSet">
          <Select placeholder="请选择" disabled />
        </Form.Item>

        <Form.Item label="数据集" name="workspace">
          <Select placeholder="请选择" disabled />
        </Form.Item>

        <Form.Item
          label="模板上传"
          name="fileUrl"
          rules={[{ required: true, message: '请上传模板!' }]}
        >
          <UploadFile maxCount={1} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TemplateModal;
