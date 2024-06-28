import { ConfigProvider as TeamConfigProvider } from 'antd';
import { ConfigProvider, enGB, zhCN } from 'insight';
import { useI18n } from 'proxima-sdk/hooks/Hooks';
import getPackageLocale from 'proxima-sdk/lib/getPackageLocale';
import React, { useMemo } from 'react';

const AntdConfigProvider: React.FC = ({ children }) => {
  const { activeLocale } = useI18n();

  const locale = useMemo(() => {
    return getPackageLocale(activeLocale) === 'zh' ? zhCN : enGB;
  }, [activeLocale]);

  return <ConfigProvider locale={locale}>{children}</ConfigProvider>;
};

// 兼容从team引入的组件的国际化问题
const AntdTeamConfigProvider: React.FC = ({ children }) => {
  const { activeLocale } = useI18n();

  const locale = useMemo(() => {
    return getPackageLocale(activeLocale) === 'zh' ? zhCN : enGB;
  }, [activeLocale]);

  return <TeamConfigProvider locale={locale}>{children}</TeamConfigProvider>;
};

export { AntdTeamConfigProvider };
export default AntdConfigProvider;
