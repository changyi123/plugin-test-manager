import { Button, Switch } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

import { getGeneralSetting, updateGeneralSetting } from '@/lib/api/common';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

const GeneralSettings = () => {
  const { t } = useI18n();
  const [checked, setChecked] = useState(false);
  const [generalSetting, setGeneralSetting] = useState<any>();

  useEffect(() => {
    const query = async () => {
      const generalSetting = await getGeneralSetting();
      setGeneralSetting(generalSetting);
      setChecked(Boolean(generalSetting?.caseDetailExtra));
    };
    query();
  }, []);

  const handleChange = useCallback(value => {
    setChecked(value);
  }, []);

  const handleSave = useCallback(async () => {
    await updateGeneralSetting({ caseDetailExtra: checked, objectId: generalSetting?.objectId });
  }, [generalSetting, checked]);
  return (
    <div>
      <div className={cx('section')}>
        <span className={cx('section-label')}>{t('page.config.moreConfig.caseDetailExtra')}：</span>
        <Switch checked={checked} onChange={handleChange} />
      </div>
      <Button type="primary" className={cx('action-btn')} onClick={handleSave}>
        {t('common.save')}
      </Button>
    </div>
  );
};

export default GeneralSettings;
