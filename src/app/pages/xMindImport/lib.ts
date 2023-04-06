import { getRepositoryData } from '@/lib/api/repository';

export const getRepositoryTreeWithParentNode = async workspaceKey => {
  const repositoryData = await getRepositoryData([workspaceKey]).then(data =>
    data.map(({ objectId, name, parent }) => ({
      name,
      id: objectId,
      parentId: parent?.objectId,
    })),
  );
  const RootId = 'root';
  const parentIdMapping = repositoryData.reduce((mapping, repo) => {
    const parentId = repo?.parentId ?? RootId;
    const children = mapping[parentId] ?? [];
    return {
      ...mapping,
      [parentId]: children.concat(repo),
    };
  }, {});

  const buildTreeWithParent = (node, parent = null) => {
    const children = parentIdMapping[node.id] ?? [];
    if (parent) {
      node.parent = parent;
    }
    if (children.length) {
      return {
        ...node,
        children: children.map(child => buildTreeWithParent(child, node)),
      };
    }
    return node;
  };

  return buildTreeWithParent({ id: RootId }, null);
};
