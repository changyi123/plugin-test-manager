import React from 'react';

import { logPluginVersion } from '@/lib/utils/helper';

import PageProvider from './PageProvider';
import PlanPageLayout from './PlanPageLayout';

logPluginVersion();

const ApprovalPage = ({ setApprovalEntry }) => {
  return (
    <PageProvider>
      <PlanPageLayout setApprovalEntry={setApprovalEntry} />
    </PageProvider>
  );
};

export default ApprovalPage;
