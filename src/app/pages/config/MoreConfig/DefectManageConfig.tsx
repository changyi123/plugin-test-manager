import { useMemoizedFn } from 'ahooks';
import { Button, Form, Input, message, Select } from 'antd';
import { SystemField } from 'common/constant';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { getSettingFieldsList } from '@/lib/api/common';
import { search } from '@/lib/api/proxima';
import useI18n from '@/lib/hooks/useI18n';
import Parse from '@/lib/parse';
import { GeneralSetting } from '@/services/models';

const DefectManageConfig = () => {
  const { t } = useI18n();
  const [configId, setConfigId] = useState({
    objectId: undefined,
  });
  const [formData, setFormData] = useState({
    iql: '',
    defaultValueCustomKey: '',
  });
  const [dataQuoteFields, setDataQuoteFields] = useState([]);

  const verifyIQL = async iql => {
    const result = await search(iql, [SystemField.Id], 1);
    return result?.length;
  };

  const handleSave = useCallback(
    async config => {
      if (configId) {
        if (config?.iql) {
          const isValid = await verifyIQL(config?.iql);
          if (!isValid) {
            return;
          }
        }
        const query = new Parse.Query(GeneralSetting);
        query.equalTo('objectId', configId);
        try {
          const configToUpdate = await query.first();
          configToUpdate.set('defectsDefaultFieldInfo', config);
          await configToUpdate.save();
          message.success(t('common.saveSuccess'));
        } catch (error) {
          message.error(error.message);
        }
      }
    },
    [configId, t, verifyIQL],
  );
  const initData = useMemoizedFn(async () => {
    // 可能会有并发问题，但是这都是升级后内部人员配置的。所以问题发生的概率很小，先忽略不计
    let _generalConfig = await new Parse.Query(GeneralSetting)
      .select(['objectId', 'defectsDefaultFieldInfo'])
      .first();
    if (!_generalConfig) {
      _generalConfig = await new GeneralSetting().save({
        defectsDefaultFieldInfo: {},
      });
    }
    const config = _generalConfig?.toJSON();
    setConfigId(config.objectId);
    setFormData({
      iql: config?.defectsDefaultFieldInfo?.iql || '',
      defaultValueCustomKey: config?.defectsDefaultFieldInfo?.defaultValueCustomKey || '',
    });
  });
  const getDataQuoteFields = async () => {
    const result = await getSettingFieldsList({
      keyword: '',
      keys: ['DataQuote'],
    });
    setDataQuoteFields(result);
  };
  const uniqueKey = useMemo(() => {
    return JSON.stringify(formData);
  }, [formData]);
  useEffect(() => {
    initData();
    getDataQuoteFields();
  }, [initData]);
  return (
    <div>
      <Form key={uniqueKey} initialValues={formData} onFinish={handleSave}>
        <Form.Item
          name="defaultValueCustomKey"
          label={t('page.config.moreConfig.selectDefaultField')}
        >
          <Select allowClear showSearch optionFilterProp="label" options={dataQuoteFields} />
        </Form.Item>
        <Form.Item name="iql" label={t('page.config.moreConfig.selectInputIql')}>
          <Input allowClear placeholder={t('common.pleaseInputContent')} />
        </Form.Item>
        <Form.Item label={null}>
          <Button type="primary" htmlType="submit">
            {t('common.save')}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default DefectManageConfig;
