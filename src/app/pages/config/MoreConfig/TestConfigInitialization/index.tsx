import { useMutation } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, message, Switch } from 'antd';
import { pick } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReloadOutlined } from '@/icons';
import { updateGlobalConfig } from '@/lib/api/common';
import { getBuiltinItemTypes } from '@/lib/api/proxima';
import { BuiltinItemTypeMapping } from '@/lib/constants';

import { useDataContext } from '../../hooks';
import TestTypeMappingSelector from './formControl/TestTypeMappingSelector';
import cx from './style.less';

let builtinItemTypes = null;

const FormFieldKey = {
  enableItemTypeAutoBind: 'enableItemTypeAutoBind',
  initialItemTypeMapping: 'initialItemTypeMapping',
  enableCaseSnapshot: 'enableCaseSnapshot',
} as const;

const TestConfigInitialization = () => {
  // 事项类型映射
  const { globalConfig, refreshGlobalConfig } = useDataContext();
  const { t } = useTranslation();
  const { t: scopeT } = useTranslation('', {
    keyPrefix: 'page.config.testConfigInitialization',
  });

  const form = Form.useForm()[0];
  const enableItemTypeAutoBind = Form.useWatch(FormFieldKey.enableItemTypeAutoBind, form);
  const enableCaseSnapshot = Form.useWatch(FormFieldKey.enableCaseSnapshot, form);

  React.useEffect(() => {
    form.setFieldsValue(pick(globalConfig?.extra, Object.keys(FormFieldKey)));
  }, [form, globalConfig?.extra]);

  const resetItemTypeMapping = useMemoizedFn(() => {
    form.setFieldValue('initialItemTypeMapping', {});
  });

  const { mutateAsync: handleSubmit, isLoading } = useMutation({
    mutationFn: async () => {
      const values = form.getFieldsValue();
      if (values.enableItemTypeAutoBind && !Object.keys(values.initialItemTypeMapping).length) {
        builtinItemTypes = await getBuiltinItemTypes();
        if (builtinItemTypes.length !== 4) return message.error(scopeT('builtinItemTypeChanged'));
        // 事项类型映射
        values[FormFieldKey.initialItemTypeMapping] = BuiltinItemTypeMapping;
      }

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
      <Form.Item
        label={<div>{scopeT('switchSnapshotLabel')}</div>}
        name={FormFieldKey.enableCaseSnapshot}
        valuePropName="checked"
      >
        <Switch checked={enableCaseSnapshot} />
      </Form.Item>
      <Form.Item
        label={<div>{scopeT('switchLabel')}</div>}
        name={FormFieldKey.enableItemTypeAutoBind}
        valuePropName="checked"
      >
        <Switch checked={enableItemTypeAutoBind} />
      </Form.Item>
      {enableItemTypeAutoBind && (
        <div className={cx('item-type-mapping-label')}>
          {scopeT('initialItemTypeMappingLabel')}
          <Button
            type="link"
            size="small"
            style={{ marginLeft: 6 }}
            icon={<ReloadOutlined />}
            onClick={resetItemTypeMapping}
          >
            {scopeT('resetButtonText')}
          </Button>
        </div>
      )}
      <Form.Item hidden={!enableItemTypeAutoBind} name={FormFieldKey.initialItemTypeMapping}>
        <TestTypeMappingSelector />
      </Form.Item>

      <Button type="primary" loading={isLoading} className={cx('action-btn')} onClick={form.submit}>
        {t('common.save')}
      </Button>
    </Form>
  );
};

export default TestConfigInitialization;
