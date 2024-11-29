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

  const [workspaceQuery, testConfigQuery] = await Promise.all([
    getParseQuery(false, 'Workspace'),
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

  const [testConfigData] = await Promise.all([
    testConfigQuery
      .equalTo('workspaceKey', workspaceKey)
      .select(['itemTypeMap'])
      .first(ParseBaseQueryOptions)
      .then(o => o.toJSON()),
  ]);

  if (!testConfigData) throw new Error('current workspace has no test config');

  return {
    itemType: { key: testConfigData.itemTypeMap.TestCase },
    workspace: { objectId: workspaceId },
  };
};

export async function getItemTypeFromKey(keys) {
  const itemTypeQuery = await getParseQuery(false, 'ItemType');
  const ParseBaseQueryOptions = {
    sessionToken: global.sessionToken,
  };

  return itemTypeQuery
    .containedIn('key', keys)
    .select(['key', 'name', 'objectId', 'icon'])
    .find({
      ...ParseBaseQueryOptions,
      context: {
        displayModule: 'plugin.testManager',
      },
    })
    .then(data => data.map(i => i.toJSON()));
}
