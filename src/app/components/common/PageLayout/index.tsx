import React from 'react';
import { ResizableBox } from 'react-resizable';

import { useLayoutHeight, useResizableWidth } from './hook';
import cx from './index.less';

type RenderNodeType = React.ReactNode;

const Left: React.FC<any> = ({ children }) => {
  const [width, setWidth] = useResizableWidth();
  const height = useLayoutHeight();
  if (!children) return
  return (
    <ResizableBox
      axis="x"
      width={width}
      height={height}
      className={cx('left')}
      draggableOpts={{ enableUserSelectHack: false }}
      onResize={(_, { size }) => setWidth(size.width)}
    >
      {children}
    </ResizableBox>
  );
};

const Right: React.FC<any> = ({ children }) => {
  const height = useLayoutHeight();
  return (
    <div className={cx('right')} style={{ height }}>
      {children}
    </div>
  );
};

const NoData: React.FC<any> = ({ children }) => {
  const height = useLayoutHeight();
  return (
    <div className={cx('no-data')} style={{ height }}>
      {children}
    </div>
  );
};

const Header: React.FC<any> = ({ children }) => {
  return (
    <div data-element-id="test-manager-page-layout-header" className={cx('header')}>
      {children}
    </div>
  );
};

type PageLayoutProps = {
  className?: string;

  left?: RenderNodeType;
  right?: RenderNodeType;
  header?: RenderNodeType;
  children?: any;
};

const PageLayout = (props: React.PropsWithChildren<PageLayoutProps>) => {
  const { className, children } = props;

  const getValidateRenderElement = componentType => {
    let node = null as React.ReactNode;
    React.Children.forEach(children, child => {
      if (React.isValidElement(child) && child.type === componentType) {
        node = child;
      }
    });
    return node;
  };

  return (
    <div className={cx('layout', className)}>
      {getValidateRenderElement(Header)}
      <div className={cx('content')}>
        {getValidateRenderElement(Left)}
        {getValidateRenderElement(Right)}
        {getValidateRenderElement(NoData)}
      </div>
    </div>
  );
};

PageLayout.Left = Left;
PageLayout.Right = Right;
PageLayout.Header = Header;
PageLayout.NoData = NoData;

export default PageLayout;
