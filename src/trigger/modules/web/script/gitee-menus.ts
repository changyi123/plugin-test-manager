import { i18n } from '@giteeteam/apps-api';
import { getParseQuery } from '@giteeteam/apps-team-api';

const log = (msg, ...restArgs) => {
  console.info(`[testManager] ${msg}`, ...restArgs);
};

const getWorkspaceKey = () => {
  return global.headers['x-proxima-workspacekey'];
};

const getTenantKey = () => {
  return global.applicationId ?? global.headers['x-proxima-tenant'] ?? 'osc';
};

/** 获取产品前缀 */
const getProductPrefix = () => {
  return global.headers['x-proxima-prefix'] ?? 'project';
};

export const runGiteeMenus = async () => {
  log('gitee-menus webTrigger start');
  log(global);

  const APP_KEY = global.appKey ?? 'test_manager';
  const ParseBaseQueryOptions = {
    // sessionToken: global.sessionToken,
    useMasterKey: true,
  };

  const getGiteeMenusConfig = async (workspaceKey, info) => {
    const tenantKey = getTenantKey();
    const productPrefix = getProductPrefix();

    const proximaRoutePrefix = `/${productPrefix}/${tenantKey}/workspaces/${workspaceKey}`;
    const giteeRoutePrefix = `/${tenantKey}/${workspaceKey}/proxima`;

    // 生成测试管理插件菜单
    const generateGiteeMenu = ({ langKey, pageKey }) => {
      return {
        title: i18n.t(`common.pageTitle.${langKey}`),
        key: `${pageKey}-${workspaceKey}`,
        icon: 'iconNavi-icafeplan',
        // url: `${giteeRoutePrefix}/plugin/${APP_KEY}_${appId}_${pageKey}`,
        url: `${giteeRoutePrefix}/plugin/${APP_KEY}_${pageKey}`,
        type: 'IFRAME',
        openWindow: '0',
        // iframeUrl: `${proximaRoutePrefix}/plugin/${APP_KEY}_${appId}_${pageKey}?hiddenSider=true&hiddenHeader=true`,
        iframeUrl: `${proximaRoutePrefix}/plugin/${APP_KEY}_${pageKey}?hiddenSider=true&hiddenHeader=true`,
      };
    };

    const reportStatsMenu = {
      title: i18n.t('common.overview'),
      key: `test-stats-report-${workspaceKey}`,
      icon: 'iconNavi-icafeplan',
      url: `${giteeRoutePrefix}/plugin/team_insight_charts_base_team_insight_charts_base_workspace?disabledCreate=true&displayContext=test_manager&moduleKey=test_manager`,
      type: 'IFRAME',
      openWindow: '0',
      iframeUrl: `${proximaRoutePrefix}/plugin/team_insight_charts_base_team_insight_charts_base_workspace?disabledCreate=true&displayContext=test_manager&moduleKey=test_manager`,
      info,
    };

    // 是否开启测试报告
    const enableTestReport = global.env?.FEATURE_FLAGS?.includes('ENABLE_TEST_REPORT');

    const menus = [
      { pageKey: 'test-plan', langKey: 'plan' },
      { pageKey: 'test-repository', langKey: 'repository' },
      enableTestReport && { pageKey: 'test-report', langKey: 'report' },
    ]
      .filter(Boolean)
      .map(generateGiteeMenu)
      .concat(reportStatsMenu);

    return menus;
  };

  const workspaceKey = getWorkspaceKey();

  const responser = async () => {
    if (!workspaceKey) throw new Error('NO_WORKSPACE_KEY');
    console.info(
      'test_manager_global.env.ENABLE_PLUGIN_WORKSPACE_KEY',
      global.env.ENABLE_PLUGIN_WORKSPACE_KEY,
    );
    // 判断环境变量中是否有 ENABLE_PLUGIN_WORKSPACE_KEY, 如果有则直接对比判断，不走应用中心表查询
    if (Array.isArray(global?.env?.ENABLE_PLUGIN_WORKSPACE_KEY)) {
      const isEnabled = global.env.ENABLE_PLUGIN_WORKSPACE_KEY.includes(workspaceKey);
      if (isEnabled) {
        return getGiteeMenusConfig(workspaceKey, {
          token: 'plugin-config',
          workspaceKey,
          pluginConfig: global?.env?.ENABLE_PLUGIN_WORKSPACE_KEY,
        });
      }
    }

    const appWorkspace = await getParseQuery(false, 'AppsWorkspace')
      .equalTo('appKey', APP_KEY)
      .equalTo('environmentKey', 'production')
      .include('workspaces')
      .first(ParseBaseQueryOptions);

    const globalWorkspace = appWorkspace ? appWorkspace.get('global') : true;
    let info = {
      token: 'global',
      workspaceKey,
      globalWorkspace,
    } as any;

    if (!globalWorkspace) {
      const hasTestManagerPlugin = appWorkspace
        ?.get('workspaces')
        ?.map(workspace => workspace.get?.('key') ?? workspace?.key ?? workspace)
        ?.includes(workspaceKey);

      info = {
        token: 'workspace',
        globalWorkspace,
        hasTestManagerPlugin,
        workspaceKeys: appWorkspace
          ?.get('workspaces')
          ?.map(workspace => workspace.get?.('key') ?? workspace?.key ?? workspace),
        workspaceKey,
      };

      if (!hasTestManagerPlugin) throw new Error('CURRENT_WORKSPACE_NOT_TEST_INSTALLED');
    }

    return getGiteeMenusConfig(workspaceKey, info);
  };

  try {
    const response = await responser();
    return response;
  } catch (err) {
    log('gitee-menus webTrigger error', err);
    return [];
  }
};
