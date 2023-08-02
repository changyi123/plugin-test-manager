import { getParseQuery, i18n } from '@giteeteam/apps-team-api';
import cloneDeep from 'lodash/cloneDeep';
import keyBy from 'lodash/keyBy';

import { InfinityLimit, RepositoryClassName } from '../../../common/constant';
import { RepositoryTreePayload } from '../../../common/types/api';
import iqlSearchParamsBuilder from '../../../common/utils/iqlSearchParamsBuilder';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { aggsSearch } from '../../lib/coreApi';
import { getPayload } from '../../lib/iqlRequest';
import { logTimeCost } from '../../lib/logger';
import { getRepositoryTree } from '../../lib/repository';

// 未分组模块 key
const UngroupedRepositoryKey = 'root';

/** 获取测试用例库树组件 */
export const repositoryTree = async () => {
  const { body, sessionToken } = getReqInfoFromVMRuntime<RepositoryTreePayload>();

  const processLoggerDump = logTimeCost('build tree process');

  const { repositoryTree } = await getRepositoryTree({
    sessionToken,
    workspaceKey: body.workspaceKey,
  });

  try {
    const addRepositoryCaseCountsField = repo => {
      const aggregateChildrenCaseCount = repo => {
        const childCount = repo.children?.reduce((acc, childRepo) => {
          return acc + aggregateChildrenCaseCount(childRepo);
        }, 0);
        return repo.caseIds.length + (childCount ?? 0);
      };

      const caseCount = repo.caseIds.length;
      repo.counts = [caseCount, aggregateChildrenCaseCount(repo)];
      repo.children?.forEach(addRepositoryCaseCountsField);
    };

    // 增加 counts 字段
    addRepositoryCaseCountsField(repositoryTree);

    processLoggerDump();

    return buildResponse(repositoryTree);
  } catch (err) {
    return buildResponse(err);
  }
};

/** 性能优化后的接口，使用 ES 聚合查询，repository 中不包含 caseIds */
export const repositoryTreeV2 = async () => {
  const { body, sessionToken } = getReqInfoFromVMRuntime<RepositoryTreePayload>();
  const repositoryQuery = await getParseQuery(false, RepositoryClassName);

  const getRepositoryData = async () => {
    const query = await (repositoryQuery as any)
      .equalTo('workspaceKey', body.workspaceKey)
      .select(['name', 'objectId', 'parent', 'sortIndex'])
      .addAscending(['sortIndex', 'createdAt'])
      .limit(InfinityLimit);

    const repositoryParseObjects = await query.find({
      sessionToken,
    });

    const ungroupedRepository = {
      name: i18n.t('common.minderRootNodeName'),
      key: UngroupedRepositoryKey,
      parentKey: null,
      counts: [0, 0],
      children: [],
    };

    return [ungroupedRepository].concat(
      repositoryParseObjects.map(parseObj => ({
        name: parseObj.get('name'),
        key: parseObj.get('objectId'),
        parentKey: parseObj.get('parent')?.objectId ?? UngroupedRepositoryKey,
        sortIndex: parseObj.get('sortIndex'),
        counts: [0, 0],
        children: [],
      })),
    );
  };

  let linkIql: string;
  if (body.params) {
    const payload = await getPayload(body.params);
    const { iql } = iqlSearchParamsBuilder({
      payload,
      limit: InfinityLimit,
      order: [],
    });
    linkIql = iql;
  }

  const getGroupedCaseCount = async () => {
    const {
      payload: { value: result },
    } = await aggsSearch({
      size: 99999,
      // FIXME: 参数先写死后续再改
      group: [
        {
          key: 'r_test_manager_repository',
          name: '',
          fieldType: 'r_test_manager_es_text_keyword',
        },
      ],
      value: [
        {
          key: 'count',
          name: 'count',
          fieldType: 'count',
          compute: 'count',
        },
      ],
      iql: linkIql || `workspaceKey='${body.workspaceKey}' and 'test_manager_type' = "TestCase"`,
      iqlContext: {
        displayContext: 'test_manager',
      },
    });

    const groupedCaseCount = {};
    result.forEach(({ r_test_manager_repository, count }) => {
      groupedCaseCount[r_test_manager_repository ?? UngroupedRepositoryKey] = count;
    });
    return groupedCaseCount;
  };

  try {
    const [repositoryData, groupedCaseCount] = await Promise.all([
      getRepositoryData(),
      getGroupedCaseCount(),
    ]);

    const clonedGroupedCaseCount = cloneDeep(groupedCaseCount);
    repositoryData.forEach(repo => {
      repo.counts = [groupedCaseCount[repo.key] ?? 0, 0];
      delete clonedGroupedCaseCount[repo.key];
    });

    const retainedUngroupedRepositoryCount = (
      Object.values(clonedGroupedCaseCount) as number[]
    ).reduce((acc, count) => acc + count, 0);

    const ungroupedRepository = repositoryData.find(repo => repo.key === UngroupedRepositoryKey);

    ungroupedRepository.counts = [
      ungroupedRepository.counts[0] + retainedUngroupedRepositoryCount,
      0,
    ];

    const repositoryKeyMapping = keyBy(repositoryData, 'key');

    // 构建目录树
    repositoryData.forEach(repo => {
      repo.children = repositoryData.filter(item => item.parentKey === repo.key);
    });
    const addRepositoryCaseCountsField = repo => {
      const aggregateChildrenCaseCount = repo => {
        const childCount = repo.children?.reduce((acc, childRepo) => {
          return acc + aggregateChildrenCaseCount(childRepo);
        }, 0);
        return repo.counts[0] + (childCount ?? 0);
      };

      const caseCount = repo.counts[0];
      repo.counts = [caseCount, aggregateChildrenCaseCount(repo)];
      repo.children?.forEach(addRepositoryCaseCountsField);
    };

    const rootRepositoryTreeNode = repositoryKeyMapping[UngroupedRepositoryKey];
    addRepositoryCaseCountsField(rootRepositoryTreeNode);

    return buildResponse(rootRepositoryTreeNode);
  } catch (err) {
    return buildResponse(err);
  }
};
