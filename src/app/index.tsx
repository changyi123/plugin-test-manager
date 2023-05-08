import './index.global.less';

import { ProximaSDK } from '@projectproxima/plugin-sdk';
import React from 'react';
import ReactDOM from 'react-dom';

import { getLang } from '@/lib/utils/locale';

import App from './App';
import { getMessages } from './lib/utils/locale';

const rootElement = '#test-manager';

if (window.__POWERED_BY_QIANKUN__) {
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
}

async function render(props) {
  const [locale, lngDict, antdLangPackage] = getMessages(getLang());
  const appProps = { ...props, locale, lngDict, antdLang: antdLangPackage };
  const { container } = props;
  ReactDOM.render(
    <App {...appProps} />,
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
  ReactDOM.unmountComponentAtNode(
    container ? container.querySelector(rootElement) : document.querySelector(rootElement),
  );
}
