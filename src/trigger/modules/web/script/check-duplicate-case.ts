import { getParseQuery } from '@giteeteam/apps-team-api';
import { groupBy } from 'lodash';

import { TestType } from '../../../../common/constant';
import { iqlRequest } from '../../../lib/iqlRequest';

const ParseBaseQueryOptions = {
  useMasterKey: true,
};

const parseValue = arr => {
  const numberValue = Number(arr.join(''));
  return numberValue > 0 ? numberValue : 0; //负的版本号、NaN当作0
};

const compareCheckDuplicateField = (version1, version2) => {
  const version1Arr = version1?.split('.');
  const version2Arr = version2?.split('.');

  const version1Num = parseValue(version1Arr);
  const version2Num = parseValue(version2Arr);

  if (version1Num === 0) {
    return -version2Num;
  }
  if (version2Num === 0) {
    return version1Num;
  }

  const len = Math.max(version1Arr.length, version2Arr.length);
  for (let i = 0; i < len; i++) {
    const v1 = Number(version1Arr[i]) || 0;
    const v2 = Number(version2Arr[i]) || 0;
    const result = v1 - v2;
    if (result != 0) {
      return result;
    }
  }
  return 0;
};

// 比较case的权重
// 1. 传入的自定义校验字段
// 2. 创建时间
const compareCase = (case1, case2, checkDuplicateFieldKey) => {
  if (!checkDuplicateFieldKey) {
    return new Date(case1.createdAt).getTime() - new Date(case2.createdAt).getTime() > 0;
  }

  const result = compareCheckDuplicateField(
    case1.values?.[checkDuplicateFieldKey] || '',
    case2.values?.[checkDuplicateFieldKey] || '',
  );
  if (result != 0) {
    return result > 0;
  } else {
    return new Date(case1.createdAt).getTime() - new Date(case2.createdAt).getTime() > 0;
  }
};

const findMaxCaseIndex = (list, checkDuplicateFieldKey) => {
  let maxIndex = 0;

  for (let i = 1; i < list.length; i++) {
    if (compareCase(list[i], list[maxIndex], checkDuplicateFieldKey)) {
      maxIndex = i;
    }
  }

  return maxIndex;
};

export const checkDuplicateCase = async () => {
  const { workspaceKeys: propsWorkspaceKeys, selector, checkAllWorkspace } = global.body;
  const APP_KEY = global.appKey ?? 'test_manager';

  // 去重校验的自定义字段key
  const checkDuplicateFieldKey = global.env?.CASE_DUPLICATE_CHECK_CONFIG?.fieldKey;

  console.info(
    '-----------------checkDuplicateParams------------------',
    propsWorkspaceKeys,
    selector,
    checkAllWorkspace,
    checkDuplicateFieldKey,
  );

  // 获取绑定空间
  const getInstalledWorkspaces = async () => {
    const appWorkspaceConfig = await getParseQuery(false, 'AppsWorkspace')
      .equalTo('appKey', APP_KEY)
      .equalTo('environmentKey', 'production')
      .include('workspaces')
      .first(ParseBaseQueryOptions)
      .then(data => data.toJSON());

    const { global: isGlobal, workspaces } = appWorkspaceConfig;

    let workspaceKeys = [];
    let isFetchAll = false;

    // 校验全部空间
    if (checkAllWorkspace) {
      if (isGlobal) {
        isFetchAll = true; // 全局插件需要查询所有空间
      } else {
        workspaceKeys = workspaces; // 非全局查询插件绑定的全部空间
      }
    } else {
      // 校验传入的空间
      if (isGlobal) {
        workspaceKeys = propsWorkspaceKeys; // 全局插件直接用传入的空间keys
      } else {
        workspaceKeys = propsWorkspaceKeys.filter(key => workspaces?.includes?.(key)); //非全局插件根据插件绑定的空间对传入的空间keys进行过滤
      }
    }

    // 非全局插件并且workspaceKeys为空时直接返回（workspaceKeys为空有两种情况，1.测试管理没有绑定空间. 2，查询的空间均没有绑定测试管理 ）
    if (!isFetchAll && !workspaceKeys?.length) {
      return [];
    }

    const query = getParseQuery(false, 'Workspace').select(['key', 'name']);

    console.info('-----------realWorkspaceKeys', workspaceKeys);

    if (workspaceKeys.length) {
      query.containedIn('key', workspaceKeys);
    }

    const data = await query.findAll(ParseBaseQueryOptions);
    return data.map(workspace => workspace.toJSON());
  };

  // 查询测试用例
  const queryTestCase = async workspaceKey => {
    const {
      data: { list: cases },
    } = await iqlRequest({
      query: {
        workspaceKey,
        type: TestType.Case,
      },
      selector,
      fields: [
        'id',
        'r_test_manager_repository',
        'createdAt',
        'name',
        'key',
        checkDuplicateFieldKey,
      ].filter(Boolean),
      pagination: {
        offset: 0,
        limit: 99999,
      },
    });
    console.info('---test cases-----', workspaceKey, cases);
    return cases;
  };

  // 查询分组
  const queryRepository = async workspaceKey => {
    const list = await getParseQuery(true, 'Repository')
      .equalTo('workspaceKey', workspaceKey)
      .select(['name', 'parent'])
      .findAll(ParseBaseQueryOptions);
    console.info('----repository---', list);
    return list.reduce((result, item) => {
      result[item.id] = {
        name: item.get('name'),
        objectId: item.id,
        parent: item.get('parent')?.objectId,
      };
      return result;
    }, {});
  };

  // 重复校验
  const checkDuplicate = (workspaceCase, repositoryMap) => {
    const results = [];

    const duplicateCaseIds = [];

    Object.keys(workspaceCase).forEach(workspaceId => {
      const target = workspaceCase[workspaceId];
      const cases = target.cases;

      // 没有用例时直接返回
      if (!cases?.length) {
        return;
      }

      // 没有分组的用例 repository 可能为空 或者root，这里统一成root
      cases.forEach(item => {
        if (!item.repository) {
          item.repository = 'root';
        }
      });
      const duplicateCases = [];

      // 根据所属分组进行分组
      const groupByRepositoryCase = groupBy(cases, 'repository');

      Object.keys(groupByRepositoryCase).forEach(repositoryId => {
        const sameRepositoryCases = groupByRepositoryCase[repositoryId];

        // 对应分组下用例条数小于等于1时返回
        if (sameRepositoryCases.length <= 1) return;

        // 根据name进行分组
        const groupByNameCase = groupBy(sameRepositoryCases, 'name');

        Object.keys(groupByNameCase).forEach(name => {
          const sameNameCases = groupByNameCase[name];
          // 相同名称的用例条件小于等于1时返回
          if (sameNameCases.length <= 1) return;

          // 找到最大的case
          const maxIndex = findMaxCaseIndex(sameNameCases, checkDuplicateFieldKey);

          // 去掉最大的，剩余的为重复的数据
          const savedCase = sameNameCases.splice(maxIndex, 1);

          console.info('----保留的用例', savedCase);
          console.info('----重复的用例', sameNameCases);

          const caseIds = [];
          const arr = sameNameCases.map(item => {
            caseIds.push(item.objectId);
            return {
              ...item,
              repositoryName: repositoryMap[item.repository]?.name,
            };
          });

          duplicateCases.push(...arr);
          duplicateCaseIds.push(...caseIds);
        });
      });

      if (duplicateCases.length) {
        results.push({
          workspaceName: target.workspaceName,
          workspaceKey: target.workspaceKey,
          workspaceId,
          duplicateCases,
          duplicateNum: duplicateCases.length,
        });
      }
    });
    return { list: results, duplicateCaseIds, totalDuplicateNum: duplicateCaseIds.length };
  };

  // 1. 获取绑定空间
  const workspaces = await getInstalledWorkspaces();
  if (!workspaces.length) {
    return {};
  }
  // 2。查询空间的全部用例和全部分组
  const workspaceCase = {};
  const repositoryMap = {};

  await Promise.all(
    workspaces.map(async workspace => {
      const [cases, repository] = await Promise.all([
        queryTestCase(workspace.key),
        queryRepository(workspace.key),
      ]);
      workspaceCase[workspace.objectId] = {
        workspaceName: workspace.name,
        workspaceKey: workspace.key,
        cases,
      };

      Object.assign(repositoryMap, repository);
    }),
  );

  console.info('-------workspaceCase-----', workspaceCase, repositoryMap);

  // 3. 重名校验
  return checkDuplicate(workspaceCase, repositoryMap);
};
