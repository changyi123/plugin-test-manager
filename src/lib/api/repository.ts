// import fetch from '../utils/fetch';
import Parse from '@/lib/parse';
import { Item, Repository, Workspace } from '../models';

const repositoryApi = {
  getByWorkspace: (workspaceId: string) => {
    const repository = new Parse.Query(Repository).equalTo('workspace', workspaceId).find();
    return repository;
  },

  getItemByIds: async (ids: string[]) => {
    const items = await new Parse.Query(Item).containedIn('objectId', ids).find();
    return items;
  },

  createFolder: async (params: { parentId?: string; name: string; workspaceId: string }) => {
    const repository = Repository.create({
      parent: params.parentId ? Repository.createWithoutData(params.parentId) : undefined,
      workspace: Workspace.createWithoutData(params.workspaceId),
      name: params.name,
    });

    await repository.save();
  },
};

export default repositoryApi;
