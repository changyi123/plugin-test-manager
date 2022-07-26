declare module '*.css';
declare module '*.less';
declare module '*.png';
declare module '*.svg' {
  export function ReactComponent(props: React.SVGProps<SVGSVGElement>): React.ReactElement;
  export default ReactComponent;
}
declare interface Window {
  __POWERED_BY_QIANKUN__: boolean;
  __INJECTED_PUBLIC_PATH_BY_QIANKUN__: string;
  QiankunProps: any;
}
declare let __webpack_public_path__: string;

declare module 'parse';

declare type PointerType = string | Parse.Object | Parse.Pointer;

declare module 'proxima-sdk';
