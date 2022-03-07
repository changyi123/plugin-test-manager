import React from 'react';
import cx from './index.less';
import { useLayoutHeight, useResizableWidth } from './hook';

import { ResizableBox } from 'react-resizable';

type RenderNodeType = React.ReactNode;

const Left: React.FC = ({ children }) => {
  const [width, setWidth] = useResizableWidth();
  const height = useLayoutHeight();

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

const Right: React.FC = ({ children }) => {
  const height = useLayoutHeight();
  return (
    <div className={cx('right')} style={{ height }}>
      {children}
    </div>
  );
};

const Header: React.FC = ({ children }) => {
  return <div className={cx('header')}>{children}</div>;
};

type PageLayoutProps = {
  className?: string;

  left?: RenderNodeType;
  right?: RenderNodeType;
  header?: RenderNodeType;
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
      </div>
    </div>
  );
};

PageLayout.Left = Left;
PageLayout.Right = Right;
PageLayout.Header = Header;

export default PageLayout;
