import React from 'react';
import cx from './index.less';

const TestCase = () => {
  return <div className={cx('test-case')}></div>;
};

export default React.memo(TestCase);
