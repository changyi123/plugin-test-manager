import { useMutation } from '@tanstack/react-query';
import { Button, Form, message, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateGlobalConfig } from '@/lib/api/common';
import { getAllStatus } from '@/lib/api/proxima';

import { useDataContext } from '../hooks';

export const FormFieldKey = {
  actionDisabledItemStatuses: 'actionDisabledItemStatuses',
  itemApprovalStatus: 'itemApprovalStatus',
  caseApprovalStatus: 'caseApprovalStatus',
} as const;

const ApprovalConfig = () => {
  const { globalConfig, refreshGlobalConfig } = useDataContext();
  const { t } = useTranslation();
  // const { t: scopeT } = useTranslation('', {
  //   keyPrefix: 'page.config.approvalConfig',
  // });

  const [statusOptions, setStatusOptions] = useState([]);

  useEffect(() => {
    getAllStatus().then(res => {
      setStatusOptions(res.map(item => ({
        label: item.name,
        value: item.objectId,
      })));
    });
  }, []);

  const form = Form.useForm()[0];

  useEffect(() => {
    const extra = globalConfig?.extra || {};
    const approvalConfigData = extra.approvalConfig || {};
    const formData = {
      [FormFieldKey.actionDisabledItemStatuses]: approvalConfigData.actionDisabledItemStatuses,
      [FormFieldKey.itemApprovalStatus]: approvalConfigData.itemApprovalStatus,
      [FormFieldKey.caseApprovalStatus]: approvalConfigData.caseApprovalStatus,
    };

    form.setFieldsValue(formData);
  }, [form, globalConfig?.extra]);

  const { mutateAsync: handleSubmit, isLoading } = useMutation({
    mutationFn: async () => {
      const values = form.getFieldsValue();
      console.log('ApprovalConfig useMutation update', globalConfig?.extra, values);
      // 更新全局配置
      await updateGlobalConfig({
        extra: { ...globalConfig?.extra, approvalConfig: values },
      });
      await refreshGlobalConfig();
      message.success(t('common.saveSuccess'));
    },
  });

  return (
    <Form form={form} onFinish={handleSubmit}>
      {Object.keys(FormFieldKey).map(key => (
        <>
          <h3>{t(`page.config.approvalConfig.${key}`)}</h3>
          <Form.Item key={key} name={key}>
            <Select
              showSearch
              options={statusOptions}
              mode={key === FormFieldKey.actionDisabledItemStatuses ? 'multiple' : null}
              optionFilterProp="label"
            />
          </Form.Item>
        </>
      ))}
      <Button type="primary" loading={isLoading} onClick={form.submit}>
        {t('common.save')}
      </Button>
    </Form>
  );
};

export default ApprovalConfig;
