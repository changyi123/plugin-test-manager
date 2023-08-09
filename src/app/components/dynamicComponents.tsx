import React from 'react';

export const MinderEditor = React.lazy(
  () => import(/* webpackChunkName: "module_test-manager-minder" */ 'test-manager-minder'),
);

export const BusinessTable = React.lazy(() =>
  import(/* webpackChunkName: "module_BusinessTable" */ '@/components/common/BusinessTable').then(
    module => ({
      default: module.BusinessTable,
    }),
  ),
);
