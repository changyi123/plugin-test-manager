import React from 'react';

const routes = [
  {
    path: '/testRepo',
    component: React.lazy(() => import('../pages/repository')),
    exact: true,
  },
  {
    path: '/testPanel',
    component: React.lazy(() => import('../pages/panel')),
    exact: true,
  },
  {
    path: '/dev',
    component: React.lazy(() => import('../pages/dev')),
    exact: true,
  },
  {
    path: '/testConfig',
    component: React.lazy(() => import('../pages/config')),
  },
  {
    path: '/testRun',
    component: React.lazy(() => import('../pages/run/Page')),
  },
];

export default routes;
