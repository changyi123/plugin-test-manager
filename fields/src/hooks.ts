// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Parse from 'proxima-sdk/lib/Parse';
import { useEffect, useState } from 'react';
export const useGetWorkspaceKeyById = workspaceId => {
  const [workspaceKey, setWorkspaceKey] = useState();

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const curWorkspace = await new Parse.Query('Workspace')
        .equalTo('objectId', workspaceId)
        .select('key')
        .first();
      setWorkspaceKey(curWorkspace.get('key'));
    })();
  }, [workspaceId]);
  return workspaceKey;
};
