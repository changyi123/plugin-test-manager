import React from 'react';
import cx from './index.less';
import { Item } from '@/lib/types/App';

type TestCaseProps = Item & {
  children?: React.ReactNode;
};

const TestCase: React.FC<TestCaseProps> = () => {
  return <div className={cx('test-case')}></div>;
};

export default React.memo(TestCase);
