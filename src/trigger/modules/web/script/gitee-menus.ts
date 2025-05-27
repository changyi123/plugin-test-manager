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

const getUserSessionToken = () => {
  return global.headers['x-parse-session-token'];
};

/** 获取产品前缀 */
const getProductPrefix = () => {
  return global.headers['x-proxima-prefix'] ?? 'project';
};

// 获取pluginKey
const getBoardPluginKey = (appKey, menuKey) => {
  // 测试统计使用的是报表面板
  if (menuKey === MENU_MAP.TEST_STATS_REPORT)
    return 'team_insight_charts_base_team_insight_test_manager';
  return `${appKey}_${menuKey}`;
};

const MENU_MAP = {
  TEST_PLAN: 'test-plan', // 测试计划
  TEST_TASK: 'test-task', // 测试执行任务
  TEST_REPORT: 'test-report', // 测试报告
  TEST_REPOSITORY: 'test-repository', // 测试用例库
  TEST_STATS_REPORT: 'test-stats-report', // 测试统计
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
        pageKey,
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
      pageKey: MENU_MAP.TEST_STATS_REPORT,
      key: `${MENU_MAP.TEST_STATS_REPORT}-${workspaceKey}`,
      icon: 'iconNavi-icafeplan',
      url: `${giteeRoutePrefix}/plugin/team_insight_charts_base_team_insight_test_manager?disabledCreate=true&displayContext=test_manager&moduleKey=test_manager`,
      type: 'IFRAME',
      openWindow: '0',
      iframeUrl: `${proximaRoutePrefix}/plugin/team_insight_charts_base_team_insight_test_manager?disabledCreate=true&displayContext=test_manager&moduleKey=test_manager`,
      info,
    };

    // 是否开启测试报告
    const enableTestReport = global.env?.FEATURE_FLAGS?.includes('ENABLE_TEST_REPORT');

    const menus = [
      { pageKey: MENU_MAP.TEST_PLAN, langKey: 'plan' },
      { pageKey: MENU_MAP.TEST_TASK, langKey: 'task' },
      { pageKey: MENU_MAP.TEST_REPOSITORY, langKey: 'repository' },
      enableTestReport && { pageKey: MENU_MAP.TEST_REPORT, langKey: 'report' },
    ]
      .filter(Boolean)
      .map(generateGiteeMenu)
      .concat(reportStatsMenu);

    const pluginKeys = Object.keys(MENU_MAP).map(key => getBoardPluginKey(APP_KEY, MENU_MAP[key])).concat(`${APP_KEY}_${MENU_MAP.TEST_STATS_REPORT}`);

    console.info('----------pluginKeys------', JSON.stringify(pluginKeys));

    console.info('-----workspaceKey-----', workspaceKey);

    const userSessionToken = getUserSessionToken();
    console.info('----userSessionToken', userSessionToken);

    // 查询当前用户有权限访问的Board
    let hasPermissionBoards = await getParseQuery(false, 'Board')
      .containedIn('pluginKey', pluginKeys)
      .matchesQuery('workspace', getParseQuery(false, 'Workspace').equalTo('key', workspaceKey))
      .find({ sessionToken: userSessionToken })
      .then(boards => boards?.map(board => board?.get('pluginKey')));

    console.info(
      '------------------------hasPermissionBoards------------------------------------',
      JSON.stringify(hasPermissionBoards),
    );

    return menus
      .filter(menu => {
        const pluginKey = getBoardPluginKey(APP_KEY, menu.pageKey);
        console.info('pluginKey', pluginKey);
        // 测试概览需要特殊处理，如果没有测试概览的权限，移除仪表盘的菜单
        if (pluginKey === getBoardPluginKey(APP_KEY, MENU_MAP.TEST_STATS_REPORT)) {
          return hasPermissionBoards.includes(`${APP_KEY}_${MENU_MAP.TEST_STATS_REPORT}`) && hasPermissionBoards.findIndex(key => key === pluginKey) > -1;
        }
        return hasPermissionBoards.findIndex(key => key === pluginKey) > -1;
      })
      .map(menu => {
        menu.iframeUrl = null;
        return menu;
      });
  };

  const workspaceKey = getWorkspaceKey();

  const responser = async () => {
    if (!workspaceKey) throw new Error('NO_WORKSPACE_KEY');
    console.info(
      'test_manager_global.env.ENABLE_PLUGIN_WORKSPACE_KEY',
      global.env?.ENABLE_PLUGIN_WORKSPACE_KEY,
    );

    // 判断环境变量中是否有 ENABLE_PLUGIN_WORKSPACE_KEY, 如果有则直接对比判断，不走应用中心表查询
    if (Array.isArray(global?.env?.ENABLE_PLUGIN_WORKSPACE_KEY)) {
      const isEnabled = global.env?.ENABLE_PLUGIN_WORKSPACE_KEY.includes(workspaceKey);
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
