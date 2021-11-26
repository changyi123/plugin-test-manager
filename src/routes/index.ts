import React from 'react';

const routes = [
  {
    path: '/',
    component: React.lazy(() => import('../pages/repository')),
    exact: true,
  },
  {
    path: '/testDetail',
    component: React.lazy(() => import('../pages/detail')),
    exact: true,
  },
  {
    path: '/login',
    component: lazy(() => import('../pages/demo/Demo')),
    exact: true,
  },
];

export default routes;
