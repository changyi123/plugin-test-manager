declare module '*.css';
declare module '*.less';
declare module '*.png';

declare module '*.svg';

declare type CRecord<T> = {
  [key in keyof T]: T[key];
};

declare interface Option {
  label: string;
  value: string;
}

declare module 'proxima-sdk/lib';
declare module 'proxima-sdk';

declare interface Window {
  __POWERED_BY_QIANKUN__: boolean;
  __INJECTED_PUBLIC_PATH_BY_QIANKUN__: string;
  QiankunProps: any;
  proxy?: {
    env: EnvData;
  };
  env?: EnvData;
}
declare let __webpack_public_path__: string;
