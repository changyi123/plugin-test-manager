declare module '*.css';
declare module '*.less';
declare module '*.png';
declare module '*.svg' {
  export function ReactComponent(props: React.SVGProps<SVGSVGElement>): React.ReactElement;
  const url: any;
  export default url;
}
interface EnvData {
  PROXIMA_APP_ID: string;
  PROXIMA_GATEWAY: string;
  PROXIMA_BASE_PATH: string;
  TENANT_KEY: string; // 租户
  GITEE_ONE_GATEWAY: string;
  APP_KEY?: string;
}

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
