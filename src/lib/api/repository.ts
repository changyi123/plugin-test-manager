import fetch from '../utils/fetch';
import Parse from '@/lib/parse';
import { Item, Repository } from '../models';

const repositoryApi = {
  getByWorkspace: (workspaceId: string) => {
    const repository = new Parse.Query(Repository).equalTo('workspace', workspaceId).find();
    return repository;
  },

  getItemByIds: async (ids: string[]) => {
    const items = await new Parse.Query(Item).containedIn('objectId', ids).find();
    return items;
  },

  createFolder: async () => {
    const repository = Repository.create({});
  },
};

export default repositoryApi;
