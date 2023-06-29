import React from 'react';

const routes = [
  {
    path: '/repository',
    component: React.lazy(() => import('../pages/repository')),
    exact: true,
  },
  {
    path: '/report',
    component: React.lazy(() => import('../pages/report')),
    exact: true,
  },
  {
    path: '/xmindImport',
    component: React.lazy(() => import('../pages/xMindImport')),
    exact: true,
  },
  {
    path: '/plan',
    component: React.lazy(() => import('../pages/plan')),
    exact: true,
  },
  {
    path: '/dev',
    component: React.lazy(() => import('../pages/dev')),
    exact: true,
  },
  {
    path: '/config',
    component: React.lazy(() => import('../pages/config')),
  },
  {
    path: '/panelModule',
    component: React.lazy(() => import('../modules/panel')),
    exact: true,
  },
  {
    path: '/beforeItemCreateModule',
    component: React.lazy(() => import('../modules/beforeCreateOrUpdateModal')),
    exact: true,
  },
  {
    path: '/reportCreator',
    component: React.lazy(() => import('../pages/reportTemplateCreator')),
    exact: true,
  },
  {
    path: '/reportView',
    component: React.lazy(() => import('../pages/reportView')),
    exact: true,
  },
];

export default routes;
