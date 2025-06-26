import React from 'react';

import { logPluginVersion } from '@/lib/utils/helper';

import CaseSetPageLayout from './components/CaseSetPageLayout';
import PageProvider from './components/PageProvider';

logPluginVersion();

const TestCaseSetPage = () => {
  return (
    <PageProvider>
      <CaseSetPageLayout />
    </PageProvider>
  );
};

export default TestCaseSetPage;
