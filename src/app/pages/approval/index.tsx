import { logPluginVersion } from '@/lib/utils/helper';

import PageProvider from './PageProvider';
import PlanPageLayout from './PlanPageLayout';

logPluginVersion();

const ApprovalPage = ({ setApprovalEntry, selectedApproval }) => {
  return (
    <PageProvider>
      <PlanPageLayout selectedApproval={selectedApproval} setApprovalEntry={setApprovalEntry} />
    </PageProvider>
  );
};

export default ApprovalPage;
