import keyBy from 'lodash/keyBy';
import cloneDeep from 'lodash/cloneDeep';
import { aggsSearch } from '../../lib/coreApi';
import { logTimeCost } from '../../lib/logger';
import { iqlRequest } from '../../lib/iqlRequest';
import { getParseQuery, i18n } from '@giteeteam/apps-team-api';
import { getReqInfoFromVMRuntime, buildResponse } from '../../lib/apiUtil';
import { RepositoryTreePayload, MinderDataPayload } from '../../../common/types/api';
import {
  TestType,
  SystemField,
  InfinityLimit,
  MinderNodeType,
  TestFiledKeyMapping,
  RepositoryClassName,
} from '../../../common/constant';

// 未分组模块 key
const UngroupedRepositoryKey = 'root';

const getRepositoryTree = async ({ workspaceKey, sessionToken, select = [] }) => {
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

    console.info('i18n -------------------->', `${i18n}`);

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

/** 获取 minderData */
export const minderData = async () => {
  try {
    const { body, sessionToken } = getReqInfoFromVMRuntime<MinderDataPayload>();
    const { workspaceKey, repositoryKey = 'root' } = body;

    if (!workspaceKey) throw new Error('workspaceKey is request');

    const {
      repositoryTree,
      originalData: { testCases },
    } = await getRepositoryTree({
      select: Array.from(
        new Set([SystemField.Name, SystemField.Priority, TestFiledKeyMapping.detail]),
      ),
      sessionToken,
      workspaceKey: body.workspaceKey,
    });

    const testCaseMapping = keyBy(testCases, 'objectId');

    // 构建脑图数据
    const buildMinderData = moduleOrCaseId => {
      const buildMinderNode = (data, children = []) =>
        data?.text && Array.isArray(children)
          ? {
              data,
              children: children.filter(Boolean),
            }
          : null;

      const testCase = typeof moduleOrCaseId === 'string' ? testCaseMapping[moduleOrCaseId] : null;
      const module = moduleOrCaseId && typeof moduleOrCaseId === 'object' ? moduleOrCaseId : null;
      let node = null;

      if (testCase) {
        const detail = testCase.detail ?? {};

        // 前置条件节点
        const preconditionNode = buildMinderNode({
          text: detail.precondition,
          type: MinderNodeType.Precondition,
        });

        // 步骤节点
        const stepsNodes = Array.isArray(detail.steps)
          ? detail.steps.map(step => {
              const { action, result, data } = step;

              const dataNode = buildMinderNode({
                text: data,
                type: MinderNodeType.Data,
              });

              const resultNode = buildMinderNode(
                {
                  text: result,
                  type: MinderNodeType.Result,
                },
                [dataNode],
              );

              const stepNode = buildMinderNode(
                {
                  text: action,
                  type: MinderNodeType.Step,
                },
                [resultNode],
              );

              return stepNode;
            })
          : [];

        node = buildMinderNode(
          {
            text: testCase.name,
            objectId: testCase.objectId,
            type: MinderNodeType.TestCase,
            priority: testCase.values?.priority,
          },
          [preconditionNode, ...stepsNodes].filter(Boolean),
        );
      } else if (module) {
        node = buildMinderNode(
          {
            text: module.name,
            objectId: module.key,
            // 跟节点设置未 Root 类型
            type: module.key === 'root' ? MinderNodeType.Root : MinderNodeType.Module,
          },
          []
            .concat(module.children?.map(buildMinderData))
            .concat(module.caseIds?.map(buildMinderData))
            .filter(Boolean),
        );
      }

      return node;
    };

    const getMinderRootNode = tree => {
      if (!tree) return;
      if (
        repositoryKey === tree.data.objectId &&
        [MinderNodeType.Module, MinderNodeType.Root].includes(tree.data.type)
      ) {
        return tree;
      }

      for (const node of tree.children) {
        const res = getMinderRootNode(node);
        if (res) return res;
      }
    };

    const result = getMinderRootNode(buildMinderData(repositoryTree));
    return buildResponse(result);
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
      name: '全部用例',
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
      iql: `workspaceKey='${body.workspaceKey}' and 'test_manager_type' = "TestCase"`,
      iqlContext: {
        displayContext: 'test_manager',
      },
    });

    const groupedCaseCount = {};
    result.forEach(({ r_test_manager_repository, count }) => {
      groupedCaseCount[r_test_manager_repository || UngroupedRepositoryKey] = count;
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
