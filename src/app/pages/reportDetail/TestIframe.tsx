import React from 'react';

const TestIframe: React.FC<any> = props => {
  return (
    <iframe
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      onLoad={() => {
        // const obj = ReactDOM.findDOMNode(this);
        // this.setState({ iFrameHeight: obj.contentWindow.document.body.scrollHeight + 'px' });
      }}
      ref={() => 'iframe'}
      src={props.src}
      width="100%"
      height="100%"
    />
  );
};
export default React.memo(TestIframe);
