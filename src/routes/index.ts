import React from 'react';

const routes = [
  {
    path: '/',
    component: React.lazy(() => import('../pages/repository')),
    exact: true,
  },
];

export default routes;
