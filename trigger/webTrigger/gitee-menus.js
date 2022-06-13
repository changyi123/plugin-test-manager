const APP_KEY = global.appKey ?? 'test_manager';

const log = (msg, ...restArgs) => {
  console.info(`[testManager] ${msg}`, ...restArgs);
};

log('gitee-menus webTrigger start');

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};

const getWorkspaceKey = () => {
  return global.headers['x-proxima-workspacekey'];
};

const getTenantKey = () => {
  return global.applicationId ?? global.headers['x-proxima-tenant'];
};

const getGiteeMenusConfig = (appId, workspaceKey) => {
  const tenantKey = getTenantKey() ?? 'osc';

  // 生成菜单
  const generateGiteeMenu = ({ name, pageKey }) => {
    const proximaRoutePrefix = `/project/${tenantKey}/workspaces/${workspaceKey}`;
    const giteeRoutePrefix = `/${tenantKey}/${workspaceKey}/proxima`;

    return {
      title: name,
      key: `${pageKey}-${workspaceKey}`,
      icon: 'iconNavi-icafeplan',
      url: `${giteeRoutePrefix}/plugin/${APP_KEY}_${appId}_${pageKey}`,
      type: 'IFRAME',
      openWindow: '0',
      iframeUrl: `${proximaRoutePrefix}/plugin/${APP_KEY}_${appId}_${pageKey}?hiddenSider=true&hiddenHeader=true`,
    };
  };

  const menus = [
    { name: '测试计划', pageKey: 'test-plan' },
    { name: '测试用例库', pageKey: 'test-repository' },
  ].map(generateGiteeMenu);

  return menus;
};

const appQuery = await apis.getParseQuery(false, 'App');
const workspaceKey = getWorkspaceKey();

const responser = async () => {
  if (!workspaceKey) throw new Error('NO_WORKSPACE_KEY');
  const app = await appQuery
    .equalTo('key', APP_KEY)
    .include('workspaces')
    .first()
    .then(item => item.toJSON());

  const appRefWorkspaces = app.workspaces;
  const hasTestManagerPlugin = appRefWorkspaces.find(workspace => workspace.key === workspaceKey);

  if (!hasTestManagerPlugin) throw new Error('CURRENT_WORKSPACE_NOT_TEST_INSTALLED');

  const appId = app?.objectId;
  return getGiteeMenusConfig(appId, workspaceKey);
};

try {
  const response = await responser();
  return response;
} catch (err) {
  log('gitee-menus webTrigger error', err);
  return [];
}
