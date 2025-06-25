import React from 'react';

import TestCaseSetSelector from '@/components/business/TestCaseSetSelector';
import { ArrowLeftOutlined } from '@/icons';

import { usePageContext } from '../../hook';
import cx from './index.less';

interface HeaderProps {
  setLoading?: (loading: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setLoading }) => {
  const { setTestCaseSet } = usePageContext();
  return (
    <>
      <div className={cx('page-header')}>
        <div className={cx('header-left')}>
          <ArrowLeftOutlined
            className={cx('icon')}
            onClick={() => {
              setTestCaseSet(undefined);
            }}
          />
          <TestCaseSetSelector />
        </div>
      </div>
    </>
  );
};
export default Header;
