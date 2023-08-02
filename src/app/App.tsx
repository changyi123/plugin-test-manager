import { PluginSDKContext } from '@projectproxima/plugin-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Empty, message, notification } from 'antd';
import React, { Suspense, useEffect, useMemo } from 'react';
import { HashRouter, MemoryRouter, Route, Switch, useHistory } from 'react-router-dom';

import { getRootContainer } from '@/lib/utils/helper';
import I18n from '@/lib/utils/i18n';

import useI18n from './lib/hooks/useI18n';
import routes from './routes';

const rootElement = 'test-manager';

message.config({
  getContainer: getRootContainer,
});

const ReactQueryDevtoolsProduction = React.lazy(() =>
  import(
    /* webpackChunkName: "module_react-query-devtools" */ '@tanstack/react-query-devtools/build/lib/index.prod.js'
  ).then(d => ({
    default: d.ReactQueryDevtools,
  })),
);

interface QiankunContextProps {
  setGlobalState?: (data: { data: any }) => void;
  Parse?: any;
  onRefreshContext?: any;
}

export const QiankunContext = React.createContext({} as QiankunContextProps);

const GoPropsRoute = props => {
  const history = useHistory();
  useEffect(() => {
    // 跳转渲染指定的路由
    if (props?.route) {
      history.push(props?.route);
    } else {
      // 本地调试时用
      if (props?.frame?.route && process.env.NODE_ENV === 'development') {
        history.push(props?.frame?.route);
      }
    }
  }, [history, props?.frame?.route, props?.route]);

  return null;
};

const EmptyRender = () => {
  const { t } = useI18n();
  return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<>{t('common.noData')}</>}></Empty>
  );
};

const showReactQueryDevtools = !!localStorage.getItem('showReactQueryDevtools');

const App: React.FC<{ locale: any; lngDict: any; antdLang: any }> = props => {
  const { locale, lngDict, antdLang } = props;

  const qiankunContextValue: any = useMemo(
    () => ({
      ...props,
    }),
    [props],
  );

  React.useEffect(() => {
    notification.config({
      getContainer: getRootContainer,
    });
  }, []);

  return (
    <I18n lngDict={lngDict} locale={locale}>
      <PluginSDKContext.Provider value={qiankunContextValue.sdk}>
        <QueryClientProvider client={new QueryClient()}>
          {showReactQueryDevtools && (
            <React.Suspense fallback={null}>
              <ReactQueryDevtoolsProduction initialIsOpen />
            </React.Suspense>
          )}
          <ConfigProvider
            locale={antdLang}
            getPopupContainer={() => document.getElementById(rootElement)}
            renderEmpty={EmptyRender}
          >
            {process.env.NODE_ENV === 'production' || window.__POWERED_BY_QIANKUN__ ? (
              <MemoryRouter>
                <GoPropsRoute {...props} />
                <Switch>
                  <Suspense fallback={null}>
                    {routes.map(({ path, component, exact }) => (
                      <Route path={path} component={component} exact={exact} key={path} />
                    ))}
                  </Suspense>
                </Switch>
              </MemoryRouter>
            ) : (
              <HashRouter>
                <Switch>
                  <Suspense fallback={null}>
                    {routes.map(({ path, component, exact }) => (
                      <Route path={path} component={component} exact={exact} key={path} />
                    ))}
                  </Suspense>
                </Switch>
              </HashRouter>
            )}
          </ConfigProvider>
        </QueryClientProvider>
      </PluginSDKContext.Provider>
    </I18n>
  );
};

export default App;
