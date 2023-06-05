import React from 'react';

import { useResizeContainerDOM } from '@/pages/plan/PlanPageLayout/hooks';

import ReportHeader from './Header';
import cx from './index.less';
import List from './List';

const View: React.FC<any> = () => {
  // for (const [key, value] of new URLSearchParams(window.location.search).entries()) {
  //   // searchState[key] = value;
  //   console.log('111111111--------->', key, value);
  // }
  useResizeContainerDOM();
  return (
    <div className={cx('view-box')}>
      <ReportHeader />
      <List />
    </div>
  );
};

export default View;
