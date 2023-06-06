import React, { useEffect, useState } from 'react';

import { useResizeContainerDOM } from '@/pages/plan/PlanPageLayout/hooks';
import ReportDetail from '@/pages/reportDetail';

import ReportHeader from './Header';
import cx from './index.less';
import List from './List';

const View: React.FC<any> = () => {
  const [isDetail, setIsDetail] = useState(false);
  useResizeContainerDOM();
  useEffect(() => {
    for (const [key, value] of new URLSearchParams(window.location.search).entries()) {
      console.info('111111111--------->', key, value);
      if (key === 'detail') {
        setIsDetail(true);
      }
    }
  }, []);
  return (
    <div className={cx('view-box')}>
      {isDetail ? (
        <ReportDetail />
      ) : (
        <>
          <ReportHeader />
          <List />
        </>
      )}
      {/* <>
        <ReportHeader />
        <List />
      </> */}
    </div>
  );
};

export default View;
