import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';

import { InfinityLimit } from '../../../../common/constant';
import { getReqInfoFromVMRuntime } from '../../../../trigger/lib/apiUtil';

/** 校验用例重名 */
export const duplicateName = async () => {
  const duplicateNameChunkSize = global.env.DUPLICATE_NAME_CHUNK_SIZE || 20;
  const { body } = getReqInfoFromVMRuntime<{
    workspaceKey: string;
    items: any[];
  }>();
  const getRepositoryMap = async workspaceKey => {
    const query = await (getParseQuery(true, 'Repository') as any)
      .equalTo('workspaceKey', workspaceKey)
      .select(['name', 'objectId', 'parent'])
      .limit(InfinityLimit);
    const repositoryParseObjects = await query.find({
      useMasterKey: true,
    });

    return repositoryParseObjects.reduce(
      (prev, parseObj) => ({
        ...prev,
        [parseObj.get('objectId')]: {
          key: parseObj.get('objectId'),
          name: parseObj.get('name'),
          parentId: parseObj.get('parent')?.objectId,
        },
      }),
      {},
    );
  };

  const getPath = (repository, repositoryMap) => {
    let path = '';
    const getRepositoryPath = repository => {
      if (repository?.name) path = path ? `${repository.name}/${path}` : repository.name;
      if (repository?.parentId) getRepositoryPath(repositoryMap[repository.parentId]);
    };
    getRepositoryPath(repository);
    return path;
  };

  const getRepositoryIqlMap = repositoryMap => {
    const existPathMap = {
      $root: `('test_manager_repository' is null or 'test_manager_repository' = 'root')`,
    };
    Object.entries(repositoryMap).forEach(([key, repository]) => {
      existPathMap[getPath(repository, repositoryMap)] = `'test_manager_repository' = '${key}'`;
    });
    return existPathMap;
  };

  const search = async (iql: string) => {
    return await requestCoreApi('POST', '/parse/api/search', {
      iql,
      fields: ['name'],
      displayContext: 'test_manager',
    })
      .then((data: any) => data?.payload.items ?? [])
      .catch(e => {
        console.info('search fail: ', e.message);
        return [];
      });
  };

  try {
    const { workspaceKey, items } = body;
    const repositoryMap = await getRepositoryMap(workspaceKey);
    const repositoryIqlMap = getRepositoryIqlMap(repositoryMap);
    const errors = [];
    const groupNameMap = items.reduce((map, item, index) => {
      const { name, group: groupProps } = item;
      const group = (groupProps + '').trim() || '$root';
      if (!map[group]) {
        map[group] = {};
      }
      if (typeof map[group][name] === 'number') {
        errors.push({ index: map[group][name], error: `该模块下存在同名用例，不予导入` });
      }
      map[group][name] = index;
      return map;
    }, {});
    const iqlList = Object.entries(groupNameMap)
      .flatMap(([group, nameMap]) => {
        const names = Object.keys(nameMap);
        const chunkNames = [];
        if (names?.length && repositoryIqlMap[group]) {
          while (names.length > duplicateNameChunkSize) {
            chunkNames.push(names.splice(0, duplicateNameChunkSize));
          }
          chunkNames.push(names);
          return chunkNames.map(names => ({
            iql: `${
              repositoryIqlMap[group]
            } and 'test_manager_type' = 'TestCase' and 'workspaceKey' = '${workspaceKey}' and (${names
              .map(name => `'标题' = '${name}'`)
              .join(' or ')})`,
            group,
          }));
        }
      })
      .filter(Boolean);

    console.info(groupNameMap, iqlList, repositoryIqlMap, 'duplicateName');

    const validateItem = async ({ iql, group }) => {
      return await search(iql)
        .then((data: any) => {
          console.info('data', data);
          data.forEach(item => {
            if (typeof groupNameMap[group][item.name] === 'number') {
              errors.push({
                index: groupNameMap[group][item.name],
                error: `该模块下存在同名用例，不予导入`,
              });
            }
          });
        })
        .catch(e => {
          console.info('validateItem fail: ', e.message);
        });
    };
    await Promise.all(iqlList.map(validateItem));
    return errors;
  } catch (error) {
    console.info(error);
    return [];
  }
};
