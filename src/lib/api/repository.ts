import fetch from '../utils/fetch';

const repositoryApi = {
  byWorkspace: (workspaceId: string) => fetch.$get('/', { params: { id: workspaceId } }),
};

export default repositoryApi;
