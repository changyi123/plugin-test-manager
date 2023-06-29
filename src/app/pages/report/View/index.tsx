import React from 'react';

import { useResizeContainerDOM } from '@/pages/plan/PlanPageLayout/hooks';

import ReportHeader from './Header';
import cx from './index.less';
import List from './List';

const View: React.FC<any> = () => {
  useResizeContainerDOM();
  return (
    <div className={cx('view-box')}>
      <ReportHeader />
      <List />
    </div>
  );
};

export default View;
