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
    path: '/login',
    component: React.lazy(() => import('../pages/demo/Demo')),
    exact: true,
  },
  {
    path: '/testConfig',
    component: React.lazy(() => import('../pages/config')),
  },
  {
    path: '/testRun',
    component: React.lazy(() => import('../pages/run')),
  },
];

export default routes;
