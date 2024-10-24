import { getParseQuery } from '@giteeteam/apps-team-api';

// 校验filterGroup name 是否存在（同一空间下唯一）
export const checkFilterGroupName = async () => {
  const { name, workspaceKey, currentId } = global.body;

  const query = getParseQuery(true, 'FilterGroup');

  query.equalTo('name', name).equalTo('workspaceKey', workspaceKey);

  if (currentId) {
    query.notEqualTo('objectId', currentId);
  }

  const count = await query.count({ useMasterKey: true });

  return count > 0;
};
