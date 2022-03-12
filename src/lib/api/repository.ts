/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
// import fetch from '../utils/fetch';
import Parse from '@/lib/parse';
import { Item, Repository, Test } from '../models';
import { arrayToTree } from '@/lib/utils/arrayToTree';
export interface ICommonRes<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

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
      repository.set('testDetailIds', folder.testDetailIds.filter(Boolean));
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

/*
 * copy and delete modal
 */

//删除详情，静态方法直接删除
export const deleteDetailsByIds = async (ids: string[]): Promise<any> => {
  //todo,根据ids，查到对应的details，然后拿着details去删除
  const query = new Parse.Query(Test);
  query.containedIn('objectId', ids);
  const details = await query.find();
  //静态方法直接删除
  return Parse.Object.destroyAll(details);
};

//删除事项,静态方法直接删除
export const deleteItemByIds = async (ids: string[]): Promise<any> => {
  const query = new Parse.Query(Item);
  query.containedIn('objectId', ids);
  const items = await query.find();
  return Parse.Object.destroyAll(items);
};

//清理ids
export const clearRepoDetailIds = async (branchId: string, detailIds: string[]): Promise<any> => {
  //清理对应repo的ids
  const query = new Parse.Query(Repository);
  query.equalTo('objectId', branchId); //对照对应id
  const repo = await query.find(); //repo用来最后更新操作
  if (repo.length == 0) return;
  const ids = repo[0]?.attributes?.testDetailIds ?? [];
  const nIds = ids.filter(item => !detailIds.includes(item));
  repo[0].set('testDetailIds', nIds);
  return repo[0].save();
};
