import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { clearIframeLayoutEffect } from '@/lib/testReport';

import cx from './TestIframe.less';

const TestIframe: React.ForwardRefRenderFunction<
  { refresh: () => void },
  { onLoad: (event: unknown) => void; src: string }
> = (props, ref) => {
  const iframeRef = useRef<any>();

  useEffect(() => {
    return () => {
      clearIframeLayoutEffect();
    };
  }, []);

  // const adjustIframeHeight = () => {
  //   let times = 0;
  //   const timer = setInterval(() => {
  //     const currentDom =
  //       iframeRef?.current?.contentWindow.document.querySelector('.react-grid-layout');
  //     times++;

  //     if (currentDom?.parentElement) {
  //       setTimeout(() => {
  //         const clientHeight = currentDom?.clientHeight;
  //         iframeRef.current.style.height =
  //           Math.max(clientHeight, document.body.clientHeight - 220) + 'px';
  //         clearInterval(timer);
  //       }, 300);
  //     }

  //     if (times > 1000) {
  //       clearInterval(timer);
  //     }
  //   }, 200);
  // };

  useImperativeHandle(ref, () => {
    return {
      refresh: () => iframeRef?.current?.contentWindow?.location?.reload(),
    };
  });

  return (
    <iframe
      name="report-view"
      title="report-view"
      className={cx('report-charts')}
      onLoad={event => {
        // adjustIframeHeight();
        props?.onLoad?.(event);
      }}
      ref={iframeRef}
      src={props.src}
    />
  );
};
export default forwardRef(TestIframe);
