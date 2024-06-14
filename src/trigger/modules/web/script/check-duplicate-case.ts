import { i18n } from '@giteeteam/apps-api';
import { getParseQuery } from '@giteeteam/apps-team-api';
import { groupBy, isNumber, isString } from 'lodash';

import { TestType } from '../../../../common/constant';
import { iqlRequest } from '../../../lib/iqlRequest';

const ParseBaseQueryOptions = {
  useMasterKey: true,
};

const parseValue = arr => {
  const numberValue = Number(arr.join(''));
  return numberValue > 0 ? numberValue : 0; //负的版本号、NaN当作0
};

const getStringValue = value => {
  if (isString(value)) {
    return value;
  } else if (isNumber(value)) {
    return `${value}`;
  } else {
    return Object.prototype.toString.call(value);
  }
};

const compareCheckDuplicateField = (version1, version2) => {
  const version1Arr = getStringValue(version1)?.split('.');
  const version2Arr = getStringValue(version2)?.split('.');

  const version1Num = parseValue(version1Arr);
  const version2Num = parseValue(version2Arr);

  if (version1Num === 0 || version2Num === 0) {
    return version1Num - version2Num;
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
  const queryTestCase = async ({
    workspaceKey,
    repositoryId,
    isRoot = false,
    allRepositoryIds = [],
  }) => {
    const limit = 200000;

    const query = { workspaceKey, type: TestType.Case };

    if (!isRoot) {
      Object.assign(query, { repository: [repositoryId] });
    } else {
      Object.assign(query, { repository: { operator: 'not in', value: allRepositoryIds } });
    }

    console.info('repositoryId----', query);

    const {
      data: { list: cases, total },
    } = await iqlRequest({
      query,
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
        limit,
      },
    });
    console.info('---test cases-----', workspaceKey, total);

    if (total > limit) {
      throw new Error(i18n.t('trigger.web.script.checkDuplicateCase.caseTooMany'));
    }

    return cases;
  };

  // 查询分组
  const queryRepository = async workspaceKey => {
    const list = await getParseQuery(true, 'Repository')
      .equalTo('workspaceKey', workspaceKey)
      .select(['name', 'parent'])
      .findAll(ParseBaseQueryOptions);
    console.info('----repository---', list);

    const repositoryIds = [];
    const repositoryMap = {};

    list.forEach(item => {
      Object.assign(repositoryMap, {
        [item.id]: {
          name: item.get('name'),
          objectId: item.id,
          parent: item.get('parent')?.objectId,
        },
      });
      repositoryIds.push(item.id);
    });

    return { repositoryMap, repositoryIds };
  };

  const queryRepositoryCase = async workspaceKey => {
    // 获取空间下的全部分组
    const { repositoryIds, repositoryMap } = await queryRepository(workspaceKey);

    const repositoryCase = {};

    const queryNoRepositoryCase = async (workspaceKey, repositoryIds, repositoryCase) => {
      const cases = await queryTestCase({
        workspaceKey,
        repositoryId: null,
        isRoot: true,
        allRepositoryIds: repositoryIds,
      });
      if (cases?.length) {
        repositoryCase.root = cases.map(item => ({
          ...item,
          repository: 'root',
        }));
      }
    };

    // 获取各个分组下的用例
    await Promise.all([
      ...repositoryIds.map(async repositoryId => {
        const cases = await queryTestCase({
          workspaceKey,
          repositoryId,
        });
        if (cases?.length) {
          repositoryCase[repositoryId] = cases.map(item => ({
            ...item,
            repositoryName: repositoryMap[repositoryId]?.name,
          }));
        }
      }),
      queryNoRepositoryCase(workspaceKey, repositoryIds, repositoryCase),
    ]);
    return repositoryCase;
  };

  // 重复校验
  const checkDuplicate = workspaceCase => {
    const results = [];

    const duplicateCaseIds = [];

    Object.keys(workspaceCase).forEach(workspaceId => {
      const target = workspaceCase[workspaceId];
      const repositoryCase = target.repositoryCase;

      const keys = Object.keys(repositoryCase);
      // 分组下没有用例时返回
      if (!keys?.length) {
        return;
      }

      const duplicateCases = [];

      keys.forEach(repositoryId => {
        const sameRepositoryCases = repositoryCase[repositoryId];

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

          duplicateCases.push(...sameNameCases);
          duplicateCaseIds.push(...sameNameCases.map(item => item.objectId));
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
  // 2。查询空间的分组和用例
  const workspaceCase = {};

  await Promise.all(
    workspaces.map(async workspace => {
      const repositoryCase = await queryRepositoryCase(workspace.key);
      workspaceCase[workspace.objectId] = {
        workspaceName: workspace.name,
        workspaceKey: workspace.key,
        repositoryCase,
      };
    }),
  );

  console.info('-------workspaceCase-----', workspaceCase);

  // 3. 重名校验
  return checkDuplicate(workspaceCase);
};
