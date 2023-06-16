import React from 'react';

export const TableCell = React.lazy(() =>
  import(
    /* webpackChunkName: "module_apps-team-components" */ '@giteeteam/apps-team-components'
  ).then(module => ({
    default: module.TableCell,
  })),
);

export const UserCell = React.lazy(() =>
  import(
    /* webpackChunkName: "module_apps-team-components" */ '@giteeteam/apps-team-components'
  ).then(module => ({
    default: module.UserCell,
  })),
);

export const LibraryProvider = React.lazy(() =>
  import(
    /* webpackChunkName: "module_apps-team-components" */ '@giteeteam/apps-team-components'
  ).then(module => ({
    default: module.UserCell,
  })),
);

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
