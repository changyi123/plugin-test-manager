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
const appInstallationQuery = await apis.getParseQuery(false, 'AppInstallation');
const workspaceQuery = await apis.getParseQuery(false, 'Workspace');

const workspaceKey = getWorkspaceKey();

const responser = async () => {
  if (!workspaceKey) throw new Error('NO_WORKSPACE_KEY');
  appInstallationQuery.matchesQuery('app', appQuery.equalTo('key', APP_KEY));
  const appInstallationParseObjs = await appInstallationQuery.find(ParseBaseQueryOptions);
  // 应用关联的空间模板
  const appRefWorkspaceSchemas =
    appInstallationParseObjs?.map(item => item?.toJSON()?.workspaceScheme?.objectId) ?? [];

  const workspace = await workspaceQuery
    .containedIn('workspaceScheme', appRefWorkspaceSchemas)
    .equalTo('key', workspaceKey)
    .first(ParseBaseQueryOptions);

  if (!workspace) throw new Error('NOT_FOUND_WORKSPACE');

  const appId = appInstallationParseObjs?.[0]?.toJSON()?.app?.objectId;
  return getGiteeMenusConfig(appId, workspaceKey);
};

try {
  const response = await responser();
  return response;
} catch (err) {
  log('gitee-menus webTrigger error', err);
  return [];
}
