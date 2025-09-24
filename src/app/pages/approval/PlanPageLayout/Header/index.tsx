import React from 'react';

import { ArrowLeftOutlined } from '@/icons';
import useI18n from '@/lib/hooks/useI18n';

import { usePageContext } from '../../hook';
import cx from './index.less';

interface HeaderProps {
  activeType?: string;
  setActiveType?: (val) => void;
}

const Header: React.FC<HeaderProps> = ({ activeType, setActiveType }) => {
  const { t } = useI18n();
  const { setSelectedTestApproval } = usePageContext();

  return (
    <div className={cx('page-header')}>
      <div className={cx('header-left')}>
        <ArrowLeftOutlined
          className={cx('icon')}
          onClick={() => {
            setSelectedTestApproval(undefined);
          }}
        />
        <div className={cx('test-tabs')}>
          <div
            className={cx('tab-title', activeType === 'TestApproval' ? 'actived' : '')}
            onClick={() => {
              setActiveType('TestApproval');
            }}
          >
            {t('common.allTestCase')}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Header;
