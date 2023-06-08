import React from 'react';

import { useGetReportLInkPLan } from './hooks';

const ReportLinkPlan: React.FC<{ linkPlanId?: string[] }> = ({ linkPlanId }) => {
  const list = useGetReportLInkPLan(linkPlanId);
  return <span>{list?.map(d => d.name)?.join('/') ?? '-'}</span>;
};

export default React.memo(ReportLinkPlan);
