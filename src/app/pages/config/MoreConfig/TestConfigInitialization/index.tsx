import { message, Switch } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { updateGlobalConfig } from '@/lib/api/common';
import { getBuiltinItemTypes } from '@/lib/api/proxima';

import { useDataContext } from '../../hooks';
import cx from './style.less';

let builtinItemTypes = null;

const TestConfigInitialization = () => {
  const { t: scopeT } = useTranslation('', {
    keyPrefix: 'page.config.testConfigInitialization',
  });

  const [loading, setLoading] = React.useState(false);
  const { globalConfig, refreshGlobalConfig } = useDataContext();

  const handleSwitchChange = async checked => {
    if (checked) {
      setLoading(true);
      if (!builtinItemTypes) {
        builtinItemTypes = await getBuiltinItemTypes();
      }
      // 查询内置类型是否有修改
      if (builtinItemTypes.length !== 3) {
        return message.error(scopeT('builtinItemTypeChanged'));
      }
    }
    // 更新全局配置
    await updateGlobalConfig({
      extra: {
        enableItemTypeAutoBind: checked,
      },
    });
    await refreshGlobalConfig();
    setLoading(false);
    message.success(scopeT('messageSuccess'));
  };

  return (
    <div className={cx('container')}>
      <div>
        <span className={cx('label')}>{scopeT('switchLabel')}</span>
        <Switch
          loading={loading}
          onChange={handleSwitchChange}
          checked={!!globalConfig.extra?.enableItemTypeAutoBind}
        />
      </div>
    </div>
  );
};

export default TestConfigInitialization;
