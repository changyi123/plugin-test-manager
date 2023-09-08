import React, { useEffect, useRef } from 'react';

import { clearIframeLayoutEffect } from '@/lib/testReport';

import cx from './TestIframe.less';

const TestIframe: React.FC<any> = props => {
  const iframeRef = useRef<any>();

  useEffect(() => {
    return () => {
      clearIframeLayoutEffect();
    };
  }, []);

  const adjustIframeHeight = () => {
    let times = 0;
    const timer = setInterval(() => {
      const currentDom =
        iframeRef?.current?.contentWindow.document.querySelector('.react-grid-layout');
      times++;

      if (currentDom?.parentElement) {
        setTimeout(() => {
          const clientHeight = currentDom?.clientHeight;
          iframeRef.current.style.height =
            Math.max(clientHeight, document.body.clientHeight - 220) + 'px';
          clearInterval(timer);
        }, 300);
      }

      if (times > 1000) {
        clearInterval(timer);
      }
    }, 200);
  };

  return (
    <iframe
      name="report-view"
      title="report-view"
      className={cx('report-charts', props.className)}
      onLoad={event => {
        adjustIframeHeight();
        props?.onLoad?.(event);
      }}
      ref={iframeRef}
      src={props.src}
      width={props.width}
    />
  );
};
export default React.memo(TestIframe);
