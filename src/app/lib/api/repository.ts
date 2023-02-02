/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
// import fetch from '../utils/fetch';
import Parse from '@/lib/parse';
import { Item, Repository, Test } from '../models';
import { arrayToTree } from '@/lib/utils/arrayToTree';
import { UNGROUPED_FOLDER_KEY } from '@/pages/repository/constant';
import { generateSortIndex } from '../utils/helper';
import { pick } from 'lodash';
export interface ICommonRes<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export const getRepositoryData = async (workspaceKeys: string[]) => {
  const repositoryData = await new Parse.Query(Repository)
    .containedIn('workspaceKey', workspaceKeys)
    .limit(9999)
    .find();

  return repositoryData.map(d => d?.toJSON());
};

export const getFolderTree = async (workspaceKey: string) => {
  const repositoryObjects = await new Parse.Query(Repository)
    .equalTo('workspaceKey', workspaceKey)
    .addAscending(['createdAt', 'sortIndex'])
    .limit(99999)
    .find();

  const repositories = repositoryObjects.map(item => {
    const repository = item.toJSON();
    return {
      name: repository.name,
      key: repository.objectId,
      parentKey: repository.parent?.objectId ?? null,
      workspaceKey: repository.workspaceKey,
    };
  });
  const folderTree = arrayToTree(repositories);

  (folderTree as any).flattenedTreeData = repositories;

  return folderTree;
};

export const createFolder = async (params: {
  parentKey?: string;
  name: string;
  workspaceKey: string;
  sortIndex?: number;
}) => {
  const batchSortIndex = generateSortIndex();

  const repository = new Repository({
    parent: params.parentKey ? Repository.createWithoutData(params.parentKey) : undefined,
    workspaceKey: params.workspaceKey,
    name: params.name,
    sortIndex: params.sortIndex ?? batchSortIndex,
  });

  return await repository.save();
};

/** 批量创建用例模块 */
export const createRepositories = async repositories => {
  const needSaveRepositoryObjects = repositories
    .map(data =>
      pick(Object.assign({}, data, { sortIndex: generateSortIndex() }), [
        'name',
        'parent',
        'sortIndex',
        'workspaceKey',
      ]),
    )
    .map(data => {
      const repositoryObj = new Repository();
      Object.keys(data).forEach(key => {
        if (key === 'parent') {
          repositoryObj.set(
            'parent',
            data[key] ? Repository.createWithoutData(data[key]) : undefined,
          );
        } else if (data[key]) {
          repositoryObj.set(key, data[key]);
        }
      });

      return repositoryObj;
    });

  return Parse.Object.saveAll(needSaveRepositoryObjects).then(objects => {
    return objects.map((obj, index) => ({
      ...repositories,
      ...obj.toJSON(),
    }));
  });
};

export const updateFolders = async (
  folders: {
    key: string;
    name?: string;
    testDetailIds?: string[];
    parentKey?: string;
    sortIndex?: number;
  }[],
) => {
  folders = folders.filter(item => item.key !== UNGROUPED_FOLDER_KEY);
  const needUpdateRepositories = folders.map(folder => {
    const repository = new Repository({
      objectId: folder.key,
    });

    if ('parentKey' in folder) {
      repository.set('parent', folder.parentKey && Repository.createWithoutData(folder.parentKey));
    }

    if ('name' in folder) {
      repository.set('name', folder.name);
    }

    if ('sortIndex' in folder) {
      repository.set('sortIndex', folder.sortIndex);
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
