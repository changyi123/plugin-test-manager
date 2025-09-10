import { useMutation } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, message, Switch, Radio } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReloadOutlined } from '@/icons';
import { updateGlobalConfig } from '@/lib/api/common';
import { getBuiltinItemTypes } from '@/lib/api/proxima';
import { getAppEnv } from '@/lib/appEnv';
import { BuiltinItemTypeMapping, CASESNAPSHOT_TYPE, caseSnapshotOpt } from '@/lib/constants';

import { useDataContext } from '../hooks';
import cx from './style.less';

const FormFieldKey = {
  actionDisabledItemStatuses: 'actionDisabledItemStatuses',
  itemApprovalStatus: 'itemApprovalStatus',
  caseApprovalStatus: 'caseApprovalStatus',
} as const;

const ApprovalConfig = () => {
  const { globalConfig, refreshGlobalConfig } = useDataContext();
  const { t } = useTranslation();
  const { t: scopeT } = useTranslation('', {
    keyPrefix: 'page.config.approvalConfig',
  });

  const form = Form.useForm()[0];
  // const enableItemTypeAutoBind = Form.useWatch(FormFieldKey.enableItemTypeAutoBind, form);
  // const caseSnapshotType = Form.useWatch(['caseSnapshot', 'type'], form);

  React.useEffect(() => {
    const extra = globalConfig?.extra || {};
    const formData = {
      // enableItemTypeAutoBind: extra.enableItemTypeAutoBind,
      initialItemTypeMapping: extra.initialItemTypeMapping,
      // caseSnapshot: extra.caseSnapshot,
    };

    form.setFieldsValue(formData);
  }, [form, globalConfig?.extra]);

  const resetItemTypeMapping = useMemoizedFn(() => {
    form.setFieldValue('initialItemTypeMapping', {});
  });

  const { mutateAsync: handleSubmit, isLoading } = useMutation({
    mutationFn: async () => {
      const values = form.getFieldsValue();
      console.log('ApprovalConfig useMutation update', globalConfig?.extra, values);
      // 更新全局配置
      await updateGlobalConfig({
        extra: { ...globalConfig?.extra, ...values },
      });
      await refreshGlobalConfig();
      message.success(scopeT('messageSuccess'));
    },
  });

  return (
    <Form form={form} onFinish={handleSubmit} className={cx('container')}>
      {/* <Form.Item name={FormFieldKey.initialItemTypeMapping}>
        <TestTypeMappingSelector />
      </Form.Item> */}
      <Form.Item name={FormFieldKey.actionDisabledItemStatuses}>
        {/* <Switch /> */}
      </Form.Item>

      <Button type="primary" loading={isLoading} className={cx('action-btn')} onClick={form.submit}>
        {t('common.save')}
      </Button>
    </Form>
  );
};

export default ApprovalConfig;
