import React from 'react';

const routes = [
  {
    path: '/repository',
    component: React.lazy(
      () => import(/* webpackChunkName: "route_repository" */ '../pages/repository'),
    ),
    exact: true,
  },
  {
    path: '/report',
    component: React.lazy(() => import(/* webpackChunkName: "route_report" */ '../pages/report')),
    exact: true,
  },
  {
    path: '/xmindimport',
    component: React.lazy(
      () => import(/* webpackChunkName: "route_xMindImport" */ '../pages/xMindImport'),
    ),
    exact: true,
  },
  {
    path: '/plan',
    component: React.lazy(() => import(/* webpackChunkName: "route_plan" */ '../pages/plan')),
    exact: true,
  },
  {
    path: '/dev',
    component: React.lazy(() => import(/* webpackChunkName: "route_dev" */ '../pages/dev')),
    exact: true,
  },
  {
    path: '/config',
    component: React.lazy(() => import(/* webpackChunkName: "route_config" */ '../pages/config')),
  },
  {
    path: '/panelModule',
    component: React.lazy(() => import(/* webpackChunkName: "route_panel" */ '../modules/panel')),
    exact: true,
  },
  {
    path: '/beforeItemCreateModule',
    component: React.lazy(
      () =>
        import(
          /* webpackChunkName: "route_beforeCreateOrUpdateModal" */ '../modules/beforeCreateOrUpdateModal'
        ),
    ),
    exact: true,
  },
  {
    path: '/reportCreator',
    component: React.lazy(
      () =>
        import(
          /* webpackChunkName: "route_reportTemplateCreator" */ '../pages/reportTemplateCreator'
        ),
    ),
    exact: true,
  },
];

export default routes;
