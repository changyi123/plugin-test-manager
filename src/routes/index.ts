import { lazy } from 'react';

const routes = [
  {
    path: '/',
    component: lazy(() => import('../pages/repository')),
    exact: true,
  },
  {
    path: '/testDetail',
    component: lazy(() => import('../pages/detail')),
    exact: true,
  },
];

export default routes;
