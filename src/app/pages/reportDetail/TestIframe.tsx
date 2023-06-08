import React from 'react';

const TestIframe: React.FC<any> = props => {
  return (
    <iframe
      className={props.className}
      onLoad={() => {
        // const obj = ReactDOM.findDOMNode(this);
        // this.setState({ iFrameHeight: obj.contentWindow.document.body.scrollHeight + 'px' });
      }}
      ref={() => 'iframe'}
      src={props.src}
      width={props.width}
      height={props.height}
    />
  );
};
export default React.memo(TestIframe);
