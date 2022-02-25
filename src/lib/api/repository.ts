// import fetch from '../utils/fetch';
import Parse from '@/lib/parse';
import { Repository } from '../models';
import { arrayToTree } from '@/lib/utils/arrayToTree';

export const getFolderTree = async (workspaceKey: string) => {
  const repositoryObjects = await new Parse.Query(Repository)
    .equalTo('workspaceKey', workspaceKey)
    .addAscending(['createdAt'])
    .find();
  const repositories = repositoryObjects.map(item => {
    const repository = item.toJSON();
    return {
      name: repository.name,
      key: repository.objectId,
      testDetailIds: repository.testDetailIds ?? [],
      parentId: repository.parent?.objectId ?? null,
      workspaceKey: repository.workspaceKey,
    };
  });
  const folderTree = arrayToTree(repositories);

  return folderTree;
};

export const createFolder = async (params: {
  parentId?: string;
  name: string;
  workspaceKey: string;
}) => {
  const repository = new Repository({
    parent: params.parentId ? Repository.createWithoutData(params.parentId) : undefined,
    workspaceKey: params.workspaceKey,
    name: params.name,
  });

  return await repository.save();
};

export const updateFolders = async (
  folders: {
    key: string;
    name?: string;
    testDetailIds?: string[];
    parentId?: string;
  }[],
) => {
  const needUpdateRepositories = folders.map(folder => {
    const repository = new Repository({
      objectId: folder.key,
    });

    if ('parentId' in folder) {
      repository.set('parent', folder.parentId && Repository.createWithoutData(folder.parentId));
    }

    if ('name' in folder) {
      repository.set('name', folder.name);
    }

    if ('testDetailIds' in folder) {
      repository.set('testDetailIds', folder.testDetailIds);
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
