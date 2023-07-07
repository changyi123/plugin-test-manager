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
        currentDom.parentElement.style.overflow = 'hidden';
        currentDom.parentElement.style.marginTop = 0;

        const clientHeight = currentDom?.clientHeight;
        iframeRef.current.style.height = clientHeight + 'px';
        clearInterval(timer);
      }

      if (times > 200) {
        clearInterval(timer);
      }
    }, 200);
  };

  return (
    <iframe
      name="report-view"
      title="report-view"
      className={cx('report-charts', props.className)}
      onLoad={() => {
        adjustIframeHeight();
      }}
      ref={iframeRef}
      src={props.src}
      width={props.width}
    />
  );
};
export default React.memo(TestIframe);
