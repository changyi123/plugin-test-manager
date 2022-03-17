import React, { useEffect, Suspense, useMemo } from 'react';
import { getRootContainer } from '@/lib/utils/helper';
import { PluginSDKContext } from '@projectproxima/plugin-sdk';
import { ConfigProvider, message, notification } from '@osui/ui';
import { MemoryRouter, Switch, Route, useHistory, HashRouter } from 'react-router-dom';

import zhCN from 'antd/lib/locale/zh_CN';

const rootElement = 'test-manager';

message.config({
  getContainer: () =>
    document.getElementById('osc-proxima') || document.getElementById(rootElement),
});

import routes from './routes';

interface QiankunContextProps {
  setGlobalState?: (data: { data: any }) => void;
  Parse?: any;
  onRefreshContext?: any;
}

export const QiankunContext = React.createContext({} as QiankunContextProps);

const GoPropsRoute = props => {
  const history = useHistory();

  useEffect(() => {
    console.info('子应用接收route:', props?.route);
    // 跳转渲染指定的路由
    if (props?.route) {
      history.push(props?.route);
    } else {
      console.info('props?.frame?.route', props?.frame?.route);
      // 本地调试时用
      if (props?.frame?.route && process.env.NODE_ENV === 'development') {
        history.push(props?.frame?.route);
      }
    }
  }, [history, props?.frame?.route, props?.route]);

  return null;
};

const App: React.FC = props => {
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
    <PluginSDKContext.Provider value={qiankunContextValue.sdk}>
      <ConfigProvider locale={zhCN} getPopupContainer={() => document.getElementById(rootElement)}>
        {process.env.NODE_ENV === 'production' || process.env.PROXIMA_DEV_MODE === 'embed' ? (
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
    </PluginSDKContext.Provider>
  );
};

export default App;
