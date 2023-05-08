import { getParseQuery, i18n } from '@giteeteam/apps-team-api';
import keyBy from 'lodash/keyBy';

import {
  InfinityLimit,
  RepositoryClassName,
  SystemField,
  TestFiledKeyMapping,
  TestType,
} from '../../common/constant';
import { iqlRequest } from './iqlRequest';

// 未分组模块 key
export const UngroupedRepositoryKey = 'root';

export const getRepositoryTree = async ({ workspaceKey, sessionToken, select = [] }) => {
  const repositoryQuery = await getParseQuery(false, RepositoryClassName);
  // 获取空间目录
  const getRepositoryData = async () => {
    const query = await (repositoryQuery as any)
      .equalTo('workspaceKey', workspaceKey)
      .select(['name', 'objectId', 'parent', 'sortIndex'])
      .addAscending(['sortIndex', 'createdAt'])
      .limit(InfinityLimit);

    const repositoryParseObjects = await query.find({
      sessionToken,
    });

    const ungroupedRepository = {
      key: UngroupedRepositoryKey,
      name: i18n.t('common.minderRootNodeName'),
      parentKey: null,
      caseIds: [],
    };

    return repositoryParseObjects
      .map(parseObj => ({
        key: parseObj.get('objectId'),
        name: parseObj.get('name'),
        parentKey: parseObj.get('parent')?.objectId ?? UngroupedRepositoryKey,
        caseIds: [],
        sortIndex: parseObj.get('sortIndex'),
      }))
      .concat(ungroupedRepository);
  };

  // 获取全部用例
  const getAllTestCases = async () => {
    const {
      data: { list: allTestCases },
    } = await iqlRequest({
      query: {
        workspaceKey,
        type: TestType.Case,
      },
      fields: [SystemField.Id, TestFiledKeyMapping.repository, ...select],
      pagination: {
        limit: InfinityLimit,
      },
    });

    return allTestCases;
  };

  const requestQueue = [getRepositoryData(), getAllTestCases()];
  const [repositoryData, allTestCases] = await Promise.all(requestQueue);

  // 组装 caseIds 数据
  const repositoryKeyMapping = keyBy(repositoryData, 'key');
  allTestCases?.forEach(testCase => {
    const repository =
      repositoryKeyMapping[testCase.repository] ?? repositoryKeyMapping[UngroupedRepositoryKey];
    repository.caseIds = Array.from(new Set(repository.caseIds.concat(testCase.objectId)));
  });

  // 构建目录树
  repositoryData?.forEach(repo => {
    repo.children = repositoryData.filter(item => item.parentKey === repo.key);
  });

  const repositoryTree = repositoryKeyMapping[UngroupedRepositoryKey];

  return {
    repositoryTree,

    originalData: {
      testCases: allTestCases,
      repositories: repositoryData,
    },
  };
};
