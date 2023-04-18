import { getParseQuery } from '@giteeteam/apps-team-api';

// 获取事项创建的必填字段
export const getItemCreateRequiredAttrs = async (workspaceInfo: {
  objectId?: string;
  key?: string;
}) => {
  const ParseBaseQueryOptions = {
    sessionToken: global.sessionToken,
  };

  if (!workspaceInfo.objectId && !workspaceInfo.key) throw new Error('workspace is required');

  const [workspaceQuery, itemGroupQuery, testConfigQuery] = await Promise.all([
    getParseQuery(false, 'Workspace'),
    getParseQuery(false, 'ItemGroup'),
    getParseQuery(false, 'test_manager_TestConfig'),
  ]);

  if (workspaceInfo.key) {
    workspaceQuery.equalTo('key', workspaceInfo.key);
  } else if (workspaceInfo.objectId) {
    workspaceQuery.equalTo('objectId', workspaceInfo.objectId);
  }

  const { key: workspaceKey, objectId: workspaceId } = await workspaceQuery
    .select(['objectId', 'key'])
    .first(ParseBaseQueryOptions)
    .then(o => o.toJSON());

  const [itemGroupData, testConfigData] = await Promise.all([
    itemGroupQuery
      .equalTo('workspace', workspaceId)
      .select(['objectId'])
      .first(ParseBaseQueryOptions)
      .then(o => o.toJSON()),
    testConfigQuery
      .equalTo('workspaceKey', workspaceKey)
      .select(['itemTypeMap'])
      .first(ParseBaseQueryOptions)
      .then(o => o.toJSON()),
  ]);

  if (!testConfigData) throw new Error('current workspace has no test config');

  return {
    itemType: { key: testConfigData.itemTypeMap.TestCase },
    itemGroup: { objectId: itemGroupData.objectId },
    workspace: { objectId: workspaceId },
  };
};
