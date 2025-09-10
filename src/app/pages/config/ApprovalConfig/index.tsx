import { useMutation } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, message, Radio, Switch } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReloadOutlined } from '@/icons';
import { updateGlobalConfig } from '@/lib/api/common';
import { getBuiltinItemTypes } from '@/lib/api/proxima';
import { getAppEnv } from '@/lib/appEnv';
import { BuiltinItemTypeMapping, CASESNAPSHOT_TYPE, caseSnapshotOpt } from '@/lib/constants';

import { useDataContext } from '../hooks';
import TestTypeMappingSelector from './formControl/TestTypeMappingSelector';
import cx from './style.less';

const FormFieldKey = {
  enableItemTypeAutoBind: 'enableItemTypeAutoBind',
  initialItemTypeMapping: 'initialItemTypeMapping',
  caseSnapshot: {
    type: 'type',
    enableCaseExeUpdate: 'enableCaseExeUpdate',
  },
} as const;

const ApprovalConfig = () => {
  // 事项类型映射
  const { globalConfig, refreshGlobalConfig } = useDataContext();
  const { t } = useTranslation();
  const { t: scopeT } = useTranslation('', {
    keyPrefix: 'page.config.approvalConfig',
  });

  const form = Form.useForm()[0];
  const enableItemTypeAutoBind = Form.useWatch(FormFieldKey.enableItemTypeAutoBind, form);
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
      // if (values.enableItemTypeAutoBind && !Object.keys(values.initialItemTypeMapping).length) {
      //   builtinItemTypes = await getBuiltinItemTypes();
      //   if (builtinItemTypes.length !== 4) return message.error(scopeT('builtinItemTypeChanged'));
      //   // 事项类型映射
      //   values[FormFieldKey.initialItemTypeMapping] = BuiltinItemTypeMapping;
      // }

      // 更新全局配置
      await updateGlobalConfig({
        extra: Object.assign({}, values),
      });
      await refreshGlobalConfig();
      message.success(scopeT('messageSuccess'));
    },
  });

  return (
    <Form form={form} onFinish={handleSubmit} className={cx('container')}>
      <Form.Item name={FormFieldKey.initialItemTypeMapping}>
        <TestTypeMappingSelector />
      </Form.Item>

      <Button type="primary" loading={isLoading} className={cx('action-btn')} onClick={form.submit}>
        {t('common.save')}
      </Button>
    </Form>
  );
};

export default ApprovalConfig;
