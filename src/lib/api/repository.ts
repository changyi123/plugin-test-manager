// import fetch from '../utils/fetch';
import Parse from '@/lib/parse';
import { Item, Repository, Workspace } from '../models';
import { arrayToTree } from '@/lib/utils/arrayToTree';

export const getFolderTree = async (workspaceId: string) => {
  const repositoryObjects = await new Parse.Query(Repository)
    .equalTo('workspace', workspaceId)
    .addAscending(['createdAt'])
    .find();
  const repositories = repositoryObjects.map(item => {
    const repository = item.toJSON();
    return {
      key: repository.objectId,
      name: repository.name,
      itemIds: repository.issues ?? [],
      parentId: repository.parent?.objectId ?? null,
      workspaceId: repository.workspace?.objectId,
    };
  });
  const folderTree = arrayToTree(repositories);

  return folderTree;
};

export const getItemByIds = async (ids: string[]) => {
  const items = await new Parse.Query(Item)
    .containedIn('objectId', ids)
    .include(['itemType', 'status'])
    .map(item => item.toJSON());
  return items;
};

export const createFolder = async (params: {
  parentId?: string;
  name: string;
  workspaceId: string;
}) => {
  const repository = new Repository({
    parent: params.parentId ? Repository.createWithoutData(params.parentId) : undefined,
    workspace: Workspace.createWithoutData(params.workspaceId),
    name: params.name,
  });

  await repository.save();
};

export const updateFolders = async (
  folders: {
    id: string;
    parentId?: string;
    name?: string;
    itemIds?: string;
  }[],
) => {
  const needUpdateRepositories = folders.map(folder => {
    const repository = new Repository({
      objectId: folder.id,
    });

    if ('parentId' in folder) {
      repository.set('parentId', Repository.createWithoutData(folder.parentId));
    }

    if ('name' in folder) {
      repository.set('name', folder.name);
    }

    if ('itemIds' in folder) {
      repository.set('issues', folder.itemIds);
    }

    return repository;
  });

  await Parse.Object.saveAll(needUpdateRepositories);
};

export const deleteFolder = async (ids: string[]) => {
  const repositories = ids.map(
    id =>
      new Repository({
        objectId: id,
      }),
  );

  await Parse.Object.destroyAll(repositories);
};
