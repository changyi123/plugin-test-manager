import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { ProximaSDK } from '@projectproxima/plugin-sdk';
import i18n from 'i18next';
// import en from '../../locales/en-US.json';
// import zn from '../../locales/zh-CN.json';

// console.info(1111111111111, en);

import './index.global.less';

const rootElement = '#test-manager';

// i18n.init({
//   resources: {
//     en,
//     zn,
//   },
// });

if (window.__POWERED_BY_QIANKUN__) {
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
}

async function render(props) {
  console.info(22222222222, props?.sdk?.context);
  // const [locale, lngDict, antdLangPackage] = getMessages(props?.sdk?.context?.env?.LOCALES || 'zh');
  // const antdLang = await Promise.resolve(antdLangPackage);
  // const appProps = { ...props, locale, lngDict, antdLang };
  const { container } = props;
  ReactDOM.render(
    <App {...props} />,
    container ? container.querySelector(rootElement) : document.querySelector(rootElement),
  );
}

if (!window.__POWERED_BY_QIANKUN__) {
  const sdk = new ProximaSDK({ sdkServer: window.parent });
  render({ sdk });
}

export async function bootstrap(): Promise<void> {}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function mount(props): Promise<void> {
  window.QiankunProps = props;
  render(props);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function unmount(props): Promise<void> {
  const { container } = props;
  console.info('container-----------', container);
  ReactDOM.unmountComponentAtNode(
    container ? container.querySelector(rootElement) : document.querySelector(rootElement),
  );
}
