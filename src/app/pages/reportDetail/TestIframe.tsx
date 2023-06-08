import React, { useRef, useState } from 'react';

import cx from './TestIframe.less';

const TestIframe: React.FC<any> = props => {
  const iframeRef = useRef<any>();
  const [height, setHeight] = useState('100%');

  return (
    <iframe
      className={cx('report-charts', props.className)}
      onLoad={() => {
        const clientHeight =
          iframeRef?.current?.contentWindow.document.getElementsByClassName(
            'react-grid-layout',
          )?.[0]?.clientHeight;

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
