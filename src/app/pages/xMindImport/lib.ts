import { MinderNodeType } from 'common/constant';

import { getRepositoryData } from '@/lib/api/repository';
const RootRepositoryId = 'root';

export const getRepositoryTreeWithParentNode = async (workspaceKey, t?: any) => {
  const repositoryData = await getRepositoryData([workspaceKey]).then(data =>
    data.map(({ objectId, name, parent }) => ({
      name,
      id: objectId,
      parentId: parent?.objectId,
    })),
  );
  const parentIdMapping = repositoryData.reduce((mapping, repo) => {
    const parentId = repo?.parentId ?? RootRepositoryId;
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

  return buildTreeWithParent(
    {
      id: RootRepositoryId,
      type: MinderNodeType.Root,
      name: typeof t === 'function' ? t('common.allTestCase') : '全部用例',
    },
    null,
  );
};
