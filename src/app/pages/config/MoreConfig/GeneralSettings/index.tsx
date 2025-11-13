import { Button, Switch } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

import { getGeneralSetting, updateGeneralSetting } from '@/lib/api/common';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

const GeneralSettings = () => {
  const { t } = useI18n();
  const [checked, setChecked] = useState(false);
  const [allowAutomationManualExecution, setAllowAutomationManualExecution] = useState(true);
  const [generalSetting, setGeneralSetting] = useState<any>();

  useEffect(() => {
    const query = async () => {
      const generalSetting = await getGeneralSetting();
      setGeneralSetting(generalSetting);
      setChecked(Boolean(generalSetting?.caseDetailExtra));
      // 默认值为 true，如果配置中有值则使用配置值
      setAllowAutomationManualExecution(generalSetting?.allowAutomationManualExecution !== false);
    };
    query();
  }, []);

  const handleChange = useCallback(value => {
    setChecked(value);
  }, []);

  const handleAutomationChange = useCallback(value => {
    setAllowAutomationManualExecution(value);
  }, []);

  const handleSave = useCallback(async () => {
    await updateGeneralSetting({
      caseDetailExtra: checked,
      allowAutomationManualExecution,
      objectId: generalSetting?.objectId,
    });
  }, [generalSetting, checked, allowAutomationManualExecution]);
  return (
    <div>
      <div className={cx('section')}>
        <span className={cx('section-label')}>{t('page.config.moreConfig.caseDetailExtra')}：</span>
        <Switch checked={checked} onChange={handleChange} />
      </div>
      <div className={cx('section')}>
        <span className={cx('section-label')}>允许自动化用例手动执行：</span>
        <Switch checked={allowAutomationManualExecution} onChange={handleAutomationChange} />
      </div>
      <Button type="primary" className={cx('action-btn')} onClick={handleSave}>
        {t('common.save')}
      </Button>
    </div>
  );
};

export default GeneralSettings;
