import React, { useEffect, useState } from 'react';

import { useResizeContainerDOM } from '@/pages/plan/PlanPageLayout/hooks';
import ReportDetail from '@/pages/reportDetail';

import ReportHeader from './Header';
import cx from './index.less';
import List from './List';

const View: React.FC<any> = () => {
  const [isDetail, setIsDetail] = useState(false);
  const [chartGroupId, setChartGroupId] = useState<string>('');
  useResizeContainerDOM();
  useEffect(() => {
    for (const [key, value] of new URLSearchParams(window.location.search).entries()) {
      if (key === 'detail') {
        setIsDetail(true);
      }
      if (key === 'reportId') {
        setChartGroupId(value);
      }
    }
  }, []);
  return (
    <div className={cx('view-box')}>
      {isDetail ? (
        <ReportDetail chartGroupId={chartGroupId} />
      ) : (
        <>
          <ReportHeader />
          <List />
        </>
      )}
    </div>
  );
};

export default View;
