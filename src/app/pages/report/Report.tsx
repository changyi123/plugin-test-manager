import React from 'react';

import ReportHeader from './View/Header';
import List from './View/List';

const TestReportPage: React.FC = () => {
  return (
    <div style={{ height: '100%' }}>
      <ReportHeader />
      <List />
    </div>
  );
};

export default React.memo(TestReportPage);
