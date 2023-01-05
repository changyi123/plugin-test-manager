// import { TestConfigClassName } from '../../../../common/constant';
import { getParseQuery, getAppsData } from '@giteeteam/apps-team-api';
import { t } from '../../../lib/lang';

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
    sessionToken: global.sessionToken,
  };

  const getGiteeMenusConfig = async (appId, workspaceKey) => {
    const tenantKey = getTenantKey();
    const productPrefix = getProductPrefix();

    const proximaRoutePrefix = `/${productPrefix}/${tenantKey}/workspaces/${workspaceKey}`;
    const giteeRoutePrefix = `/${tenantKey}/${workspaceKey}/proxima`;

    // 生成测试管理插件菜单
    const generateGiteeMenu = ({ langKey, pageKey }) => {
      return {
        title: t(`navigation.${langKey}`),
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

    // 获取测试管理空间配置
    // const testConfigQuery = getParseQuery(false, TestConfigClassName);
    // const testConfig = await testConfigQuery
    //   .equalTo('workspaceKey', workspaceKey)
    //   .select(['defectBoard', 'displayDefectBoard'])
    //   .include('defectBoard')
    //   .first(ParseBaseQueryOptions)
    //   .then(item => item.toJSON());

    // const boardMenus = [];

    // if (testConfig?.defectBoard) {
    //   const defectBoardData = testConfig?.defectBoard;

    //   boardMenus.push({
    //     title: '缺陷管理',
    //     key: `${defectBoardData.key}-${workspaceKey}`,
    //     icon: 'iconNavi-icafeplan',
    //     url: `${giteeRoutePrefix}/boards/${defectBoardData.key}`,
    //     type: 'IFRAME',
    //     openWindow: '0',
    //     iframeUrl: `${proximaRoutePrefix}/boards/${defectBoardData.key}?hiddenSider=true&hiddenHeader=true`,
    //   });
    // }

    const reportStatsMenu = {
      title: t('navigation.overview'),
      key: `test-stats-report-${workspaceKey}`,
      icon: 'iconNavi-icafeplan',
      url: `${giteeRoutePrefix}/report/test_manager?disabledCreate=true`,
      type: 'IFRAME',
      openWindow: '0',
      iframeUrl: `${proximaRoutePrefix}/report/test_manager?disabledCreate=true`,
    };

    const menus = [
      { pageKey: 'test-plan', langKey: 'plan' },
      { pageKey: 'test-repository', langKey: 'repository' },
    ]
      .map(generateGiteeMenu)
      .concat(reportStatsMenu);

    return menus;
  };

  // const appQuery = getParseQuery(false, 'App');
  const workspaceKey = getWorkspaceKey();

  const responser = async () => {
    if (!workspaceKey) throw new Error('NO_WORKSPACE_KEY');

    const appWorkspace = await getParseQuery(false, 'AppsWorkspace')
      .equalTo('appKey', APP_KEY)
      .include('workspaces')
      .first(ParseBaseQueryOptions);

    const globalWorkspace = appWorkspace ? appWorkspace.get('global') : true;
    if (!globalWorkspace) {
      const hasTestManagerPlugin = appWorkspace
        ?.get('workspaces')
        ?.some(workspace => workspace.key === workspaceKey);
      if (!hasTestManagerPlugin) throw new Error('CURRENT_WORKSPACE_NOT_TEST_INSTALLED');
    }

    const appData = await getAppsData('Apps', { key: APP_KEY });
    const appId = appData.objectId;
    return getGiteeMenusConfig(appId, workspaceKey);
  };

  try {
    const response = await responser();
    return response;
  } catch (err) {
    log('gitee-menus webTrigger error', err);
    return [];
  }
};
