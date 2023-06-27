import React, { useEffect, useRef, useState } from 'react';

import { clearIframeLayoutEffect } from '@/lib/testReport';

import cx from './TestIframe.less';

const TestIframe: React.FC<any> = props => {
  const iframeRef = useRef<any>();
  const [height, setHeight] = useState('100%');

  useEffect(() => {
    return () => {
      clearIframeLayoutEffect();
    };
  }, []);

  return (
    <iframe
      className={cx('report-charts', props.className)}
      onLoad={() => {
        // TODO 无效果，待修改
        const currentDom =
          iframeRef?.current?.contentWindow.document.getElementsByClassName('react-grid-layout')[0];
        if (currentDom?.parentElement) {
          currentDom.parentElement.style.marginTop = 0;
        }
        const clientHeight = currentDom?.clientHeight;
        clientHeight && setHeight(`${clientHeight}px`);
      }}
      ref={iframeRef}
      src={props.src}
      width={props.width}
      height={height}
    />
  );
};
export default React.memo(TestIframe);
