import { Form, Input, message } from 'antd';
import { useAtom } from 'jotai';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { testReportMutation } from '@/services/mutation';

import type { ActionRefType } from '../index';
import { reportTemplateConnectLocation } from '../store';
import cx from './BasicConfig.less';

const BasicConfig: React.FC<{
  actionRef: React.MutableRefObject<ActionRefType>;
}> = ({ actionRef }) => {
  const { t: scopedT } = useTranslation('', {
    keyPrefix: 'page.reportTemplateCreator.basicConfig',
  });

  const form = Form.useForm()[0];
  const [reportTemplateData, setReportTemplateData] = useAtom(reportTemplateConnectLocation);

  React.useEffect(() => {
    if (reportTemplateData) {
      form.setFieldsValue({ name: reportTemplateData.name });
    }
  }, [form, reportTemplateData]);

  const { mutateAsync: createTestReport } = testReportMutation.useTestReportCreateMutation();

  React.useImperativeHandle(actionRef, () => ({
    goNextButtonClick: async () => {
      try {
        // 已存在模板数据，不需要创建，走更新逻辑
        if (reportTemplateData?.objectId) {
          // TODO: 更新测试报告模板
          return;
        }
        const data = await form.validateFields();
        const testReportTemplate = await createTestReport({
          isGlobalTemplate: true,
          isDefaultTemplate: false,
          templateConfig: {
            dataSource: {},
          },
          ...data,
        });
        setReportTemplateData(testReportTemplate);

        message.success(scopedT('message.createReportTemplateSuccess'));
        // 创建测试测试报告
      } catch (err) {
        message.error(err?.errorFields[0]?.errors[0]);
        throw err;
      }
    },
  }));

  return (
    <div className={cx('container')}>
      <h3 className={cx('title')}>{scopedT('title')}</h3>
      <Form form={form} className={cx('form')}>
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
