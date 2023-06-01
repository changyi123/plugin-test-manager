import { Form, Input, message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ActionRefType } from '../index';
import cx from './BasicConfig.less';

const BasicConfig: React.FC<{
  actionRef: React.MutableRefObject<ActionRefType>;
}> = ({ actionRef }) => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.basicConfig',
  });

  const form = Form.useForm()[0];

  React.useImperativeHandle(actionRef, () => ({
    goNextButtonClick: async () => {
      try {
        const data = await form.validateFields();
        console.error(data);
      } catch (err) {
        message.error(err?.errorFields[0]?.errors[0]);
        throw err;
      }
    },
  }));

  return (
    <div className={cx('container')}>
      <h3 className={cx('title')}>{scopedT('title')}</h3>
      <Form form={form}>
        <div className={cx('name')}>
          <p className={cx('label')}>{scopedT('form.name.label')}</p>
          <Form.Item
            name="name"
            rules={[{ required: true, message: scopedT('form.name.error') }]}
            noStyle
          >
            <Input placeholder={scopedT('form.name.placeholder')} />
          </Form.Item>
        </div>
      </Form>
    </div>
  );
};

export default React.memo(BasicConfig);
