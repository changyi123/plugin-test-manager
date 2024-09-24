import React from 'react';

import List from './View/ReportList';

const TestReportV2Page: React.FC = () => {
  return (
    <div style={{ height: '100%' }}>
      <List />
    </div>
  );
};

export default React.memo(TestReportV2Page);
