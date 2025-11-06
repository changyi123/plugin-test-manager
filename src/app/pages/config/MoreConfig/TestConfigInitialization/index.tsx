import { InfoCircleOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, message, Radio, Switch, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReloadOutlined } from '@/icons';
import { updateGlobalConfig } from '@/lib/api/common';
import { getBuiltinItemTypes } from '@/lib/api/proxima';
import { getAppEnv } from '@/lib/appEnv';
import { BuiltinItemTypeMapping, CASESNAPSHOT_TYPE, caseSnapshotOpt } from '@/lib/constants';

import { useDataContext } from '../../hooks';
import TestTypeMappingSelector from './formControl/TestTypeMappingSelector';
import cx from './style.less';

let builtinItemTypes = null;

const FormFieldKey = {
  enableItemTypeAutoBind: 'enableItemTypeAutoBind',
  initialItemTypeMapping: 'initialItemTypeMapping',
  enableCloneItemWithPlanCase: 'enableCloneItemWithPlanCase',
  caseSnapshot: {
    type: 'type',
    enableCaseExeUpdate: 'enableCaseExeUpdate',
  },
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
  const enableCloneItemWithPlanCase = Form.useWatch(FormFieldKey.enableCloneItemWithPlanCase, form);
  const caseSnapshotType = Form.useWatch(['caseSnapshot', 'type'], form);

  React.useEffect(() => {
    const extra = globalConfig?.extra || {};
    const formData = {
      enableItemTypeAutoBind: extra.enableItemTypeAutoBind,
      initialItemTypeMapping: extra.initialItemTypeMapping,
      enableCloneItemWithPlanCase: extra.enableCloneItemWithPlanCase,
      caseSnapshot: extra.caseSnapshot,
    };

    form.setFieldsValue(formData);
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
        extra: { ...globalConfig.extra, ...values },
      });
      await refreshGlobalConfig();
      message.success(scopeT('messageSuccess'));
    },
  });

  return (
    <Form form={form} onFinish={handleSubmit} className={cx('container')}>
      <Form.Item
        label={
          <div>
            {scopeT('cloneItemWithTestPlanCase')}
            <Tooltip title={scopeT('cloneItemWithTestPlanCaseTip')}>
              <InfoCircleOutlined className={cx('tip-info')} />
            </Tooltip>
          </div>
        }
        name={FormFieldKey.enableCloneItemWithPlanCase}
        valuePropName="checked"
      >
        <Switch checked={enableCloneItemWithPlanCase} />
      </Form.Item>
      {getAppEnv('ENABLED_CASE_SNAPSHOT') && (
        <Form.Item
          label={<div>{scopeT('switchSnapshotLabel')}</div>}
          name={['caseSnapshot', 'type']}
        >
          <Radio.Group options={caseSnapshotOpt(t)} />
        </Form.Item>
      )}
      {[CASESNAPSHOT_TYPE.NO_BUILDVERSION_SELVERSION].includes(caseSnapshotType) && (
        <Form.Item
          label={<div>{scopeT('enableCaseExeUpdate')}</div>}
          name={['caseSnapshot', 'enableCaseExeUpdate']}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      )}
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
