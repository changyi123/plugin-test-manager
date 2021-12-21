import React, { useEffect, Suspense, useMemo } from 'react';
import { getRootContainer } from '@/lib/utils/helper';
import { PluginSDKContext } from '@projectproxima/plugin-sdk';
import { ConfigProvider, message, notification } from '@osui/ui';
import { MemoryRouter, Switch, Route, useHistory, HashRouter } from 'react-router-dom';

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
    }
  }, [history, props?.route]);

  return null;
};

const App: React.FC = props => {
  const qiankunContextValue: any = useMemo(
    () => ({
      ...props,
    }),
    [props],
  );

  notification.config({
    getContainer: getRootContainer,
  });

  return (
    <PluginSDKContext.Provider value={qiankunContextValue.sdk}>
      <ConfigProvider getPopupContainer={() => document.getElementById(rootElement)}>
        {process.env.NODE_ENV === 'production' || process.env.PROXIMA_DEV_MODE === 'embed' ? (
          <MemoryRouter>
            <GoPropsRoute {...props} />
            <Switch>
              <Suspense fallback={<div>Loading...</div>}>
                {routes.map(({ path, component, exact }) => (
                  <Route path={path} component={component} exact={exact} key={path} />
                ))}
              </Suspense>
            </Switch>
          </MemoryRouter>
        ) : (
          <HashRouter>
            <Switch>
              <Suspense fallback={<div>Loading...</div>}>
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
