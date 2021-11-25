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
  {
    path: '/login',
    component: lazy(() => import('../pages/demo/Demo')),
    exact: true,
  },
];

export default routes;
