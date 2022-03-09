import React from 'react';

const routes = [
  {
    path: '/testRepo',
    component: React.lazy(() => import('../pages/repository')),
    exact: true,
  },
  {
    path: '/testPlan',
    component: React.lazy(() => import('../pages/plan')),
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
    path: '/beforeItemCreate',
    component: React.lazy(() => import('../pages/modules/BeforeCreateOrUpdateModal')),
    exact: true,
  },
];

export default routes;
