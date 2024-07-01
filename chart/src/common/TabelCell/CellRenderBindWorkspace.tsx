import Parse from 'proxima-sdk/lib/Parse';
import { Workspace } from 'proxima-sdk/schema/models';
import React, { useEffect, useState } from 'react';

const fetchWorkSpace = async ({ workspaceId }) => {
  return await new Parse.Query(Workspace)
    .equalTo('objectId', workspaceId)
    .select(['name', 'key'])
    .include('itemTypeScreenScheme')
    .first();
};

const BindWorkSpace = ({ workspaceId }: { workspaceId: string }) => {
  const [name, setName] = useState<string>('--');

  useEffect(() => {
    fetchWorkSpace({
      workspaceId,
    }).then(res => {
      setName(res?.attributes?.name ?? '--');
    });
  }, [workspaceId]);

  if (workspaceId !== '--') {
    return (
      <span
        title={name}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
    );
  }
  return <>--</>;
};

export default BindWorkSpace;
