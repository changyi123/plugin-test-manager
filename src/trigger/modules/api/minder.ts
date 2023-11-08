import { i18n } from '@giteeteam/apps-api';
import { getParseModel, getParseQuery, saveAllObject } from '@giteeteam/apps-team-api';
import { TestEntity } from 'common/types/test';
import flattenDeep from 'lodash/flattenDeep';
import keyBy from 'lodash/keyBy';
import omit from 'lodash/omit';
import uniqueId from 'lodash/uniqueId';

import {
  InfinityLimit,
  MinderNodeType,
  RepositoryClassName,
  SystemField,
  TestFiledKeyMapping,
  TestType,
  UngroupedRepositoryKey,
} from '../../../common/constant';
import { MinderDataImportPayload, MinderDataPayload } from '../../../common/types/api';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchCreateItems } from '../../lib/batchRequest';
import { uuidv4 } from '../../lib/helper';
import { generateSortIndex } from '../../lib/helper';
import { iqlRequest } from '../../lib/iqlRequest';
import { getItemCreateRequiredAttrs } from '../../lib/item';

/** 获取 minderData */
export const minderData = async () => {
  try {
    const { body, sessionToken } = getReqInfoFromVMRuntime<MinderDataPayload>();
    const { workspaceKey, repositoryKey = 'root' } = body;

    if (!workspaceKey) throw new Error('workspaceKey is request');

    /** 根据节点获取子树 */
    const getRepositoryTreeWithRepositoryKey = async ({
      select = [],
      workspaceKey,
      sessionToken,
      repositoryKey,
    }) => {
      // 获取 repo tree
      const getRepoTree = async () => {
        // 获取空间目录
        const getRepoData = async () => {
          const repoQuery = await getParseQuery(false, RepositoryClassName);
          const query = await (repoQuery as any)
            .equalTo('workspaceKey', workspaceKey)
            .select(['name', 'objectId', 'parent', 'sortIndex'])
            .addAscending(['sortIndex', 'createdAt'])
            .limit(InfinityLimit);

          const repositoryParseObjects = await query.find({
            sessionToken,
          });

          return repositoryParseObjects.map(parseObj => ({
            name: parseObj.get('name'),
            key: parseObj.get('objectId'),
            sortIndex: parseObj.get('sortIndex'),
            parentKey: parseObj.get('parent')?.objectId ?? UngroupedRepositoryKey,
          }));
        };

        const repos = await getRepoData();

        const RootRepo = {
          key: UngroupedRepositoryKey,
          name: i18n.t('common.minderRootNodeName'),
          parentKey: null,
        };

        // 构建用例树
        const pKeyRepoMapping = repos.reduce((mapping, repo) => {
          const pKey = repo.parentKey ?? RootRepo.key;
          const children = mapping[pKey] ?? [];
          return {
            ...mapping,
            [pKey]: children.concat(repo),
          };
        }, {});

        // 生成用例树
        const buildRepoTree = node => {
          const children = pKeyRepoMapping[node.key];
          if (Array.isArray(children)) {
            node.children = children.map(buildRepoTree);
          }
          return node;
        };

        return buildRepoTree(RootRepo);
      };

      // 根据 repo 获取测试用例
      const getTestCasesByRepoKeys = async repoKeys => {
        if (!Array.isArray(repoKeys)) return [];
        const isIncludeRootRepository = repoKeys.includes(UngroupedRepositoryKey);

        const requestQuery = {
          workspaceKey,
          type: TestType.Case,
        } as any;

        // 如果包含 root 节点，需要把空间内全部的 testCase 查出来
        // 不包含 root 节点，才需要限定 repository key 的查询范围
        if (!isIncludeRootRepository) {
          requestQuery.repository = repoKeys;
        }

        const {
          data: { list: allTestCases },
        } = await iqlRequest<TestEntity<TestType.Case>>({
          query: requestQuery,
          fields: [SystemField.Id, TestFiledKeyMapping.repository, ...select],
          pagination: {
            limit: InfinityLimit,
          },
        });

        return allTestCases;
      };

      // 获取子模块的 key
      const getSubRepoIncludeKeys = repoTree => {
        // 根据 repositoryId 获取根节点
        const getNodeByKey = (tree, key) => {
          if (!tree) return;
          if (key === tree.key) {
            return tree;
          }

          if (Array.isArray(tree.children)) {
            for (const node of tree.children) {
              const res = getNodeByKey(node, key);
              if (res) return res;
            }
          }
        };

        const node = getNodeByKey(repoTree, repositoryKey);
        const getSubRepoKeys = (node, repoKeys = []) => {
          if (node) {
            repoKeys.push(node.key);
          }
          if (Array.isArray(node.children)) {
            node.children.forEach(child => getSubRepoKeys(child, repoKeys));
          }
          return Array.from(new Set(repoKeys));
        };
        return getSubRepoKeys(node);
      };

      // 添加 caseIds
      const appendCaseIds = (repo, repoKeyCaseIdsMapping) => {
        const traverse = repo => {
          const caseIds = repoKeyCaseIdsMapping[repo.key ?? UngroupedRepositoryKey];
          if (caseIds) {
            repo.caseIds = caseIds;
          }
          if (Array.isArray(repo.children)) {
            repo.children.forEach(child => traverse(child));
          }
        };

        traverse(repo);

        return repo;
      };

      // 获取 caseIds mapping
      const getRepoKeyCaseIdsMapping = (testCases, subRepositoryKeys) => {
        // 形成 repoKey -> caseIds 的映射
        const repoKeyCaseIdsMapping = testCases.reduce((mapping, testCase) => {
          const repoKey = testCase.repository ?? UngroupedRepositoryKey;
          const arr = mapping[repoKey] ?? [];
          return {
            ...mapping,
            [repoKey]: arr.concat(testCase.objectId),
          };
        }, {});

        // 剩余的 repoKeyCaseIdsMapping
        const notExistedRepoKeyCaseIdsMapping = omit(repoKeyCaseIdsMapping, subRepositoryKeys);
        // 处理根模块
        repoKeyCaseIdsMapping[UngroupedRepositoryKey] = flattenDeep(
          Object.values(notExistedRepoKeyCaseIdsMapping),
        )
          // 包含 root 节点下的用例
          .concat(repoKeyCaseIdsMapping[UngroupedRepositoryKey]);

        return repoKeyCaseIdsMapping;
      };

      // 获取用例树
      const repoTree = await getRepoTree();

      const subRepositoryKeys = getSubRepoIncludeKeys(repoTree);
      // 获取用例树下所有的 cases
      const testCases = await getTestCasesByRepoKeys(subRepositoryKeys);
      // 形成 repoKey -> caseIds 的映射
      const repoKeyCaseIdsMapping = getRepoKeyCaseIdsMapping(testCases, subRepositoryKeys);

      console.info(
        '--------subRepositoryKeys------------>',
        testCases,
        repoKeyCaseIdsMapping,
        subRepositoryKeys,
      );

      return {
        repositoryTree: appendCaseIds(repoTree, repoKeyCaseIdsMapping),

        originalData: {
          testCases,
        },
      };
    };

    const {
      repositoryTree,
      originalData: { testCases },
    } = await getRepositoryTreeWithRepositoryKey({
      select: Array.from(
        new Set([SystemField.Name, SystemField.Priority, TestFiledKeyMapping.detail]),
      ),
      sessionToken,
      repositoryKey,
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
        const detail = (testCase as any).detail ?? {};

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

/** 测试管理脑图数据导入 */
export const minderDataImport = async () => {
  const { body, sessionToken } = getReqInfoFromVMRuntime<MinderDataImportPayload>();
  const { workspaceKey, minderData } = body;

  const [RepoModel, RepoQuery] = await Promise.all([
    getParseModel(false, RepositoryClassName),
    getParseQuery(false, RepositoryClassName),
  ]);

  const repoObjectIdMap = await RepoQuery.equalTo('workspaceKey', workspaceKey)
    .select(['name', 'parent', 'objectId'])
    .findAll({ sessionToken })
    .then(repos => {
      return repos.reduce((acc, repo) => {
        const repoData = repo.toJSON();
        const { objectId, parent, name } = repoData;
        acc[objectId] = {
          name,
          objectId,
          parent: parent?.objectId ?? null,
        };
        return acc;
      }, {});
    });

  const traverseAddParentMinderData = (node, parent = null) => {
    if (!node) return;
    node.parent = parent;
    if (!node.data?.id) {
      node.data.id = uniqueId('node');
    }
    node.children?.forEach(child => traverseAddParentMinderData(child, node));
  };

  /** 创建测试用例库模块 */
  const createRepoAndSetObjectId = async minderData => {
    // 层序遍历脑图数据
    const buildLevelOrderArr = node => {
      if (!node) return [];
      const res = [];
      const queue = [node];
      while (queue.length) {
        const currentLevelSize = queue.length;
        res.push([]);
        for (let i = 0; i < currentLevelSize; i++) {
          const current = queue.shift();
          res[res.length - 1].push(current);
          current.children?.forEach(child => queue.push(child));
        }
      }
      return res;
    };

    const levelOrderArr = buildLevelOrderArr(minderData);
    for (const levelOrder of levelOrderArr) {
      const repoData = levelOrder.filter(node => node.data.type === MinderNodeType.Module);
      // 当草稿数据中的用例库名称和已存在的用例库名称不一样时需要更新
      const needUpdateRepoParseObjects = repoData
        .filter(
          node =>
            node.data.objectId &&
            repoObjectIdMap[node.data.objectId] &&
            repoObjectIdMap[node.data.objectId].name !== node.data.text,
        )
        .map(repoData => {
          return new RepoModel({
            objectId: repoData.data.objectId,
            name: repoData.data.text,
          });
        });

      // 需要被创建的 repository
      const needCreateRepoData = repoData.filter(node => !node.data.objectId);
      const needCreateRepoParseObjects = needCreateRepoData.map((repo, index) => {
        const parentRepoId = repo.parent?.data.objectId;
        return new RepoModel({
          workspaceKey,
          name: repo.data.text,
          parent: RepoModel.createWithoutData(parentRepoId),
          sortIndex: generateSortIndex(index),
        });
      });

      const willSaveRepoParseObjects = [].concat(
        needUpdateRepoParseObjects,
        needCreateRepoParseObjects,
      );

      if (willSaveRepoParseObjects.length) {
        const createdRepos = await saveAllObject(willSaveRepoParseObjects, { sessionToken }).then(
          items => items.map(item => item.toJSON()),
        );
        const createdNameRepoMap = keyBy(createdRepos, 'name');
        repoData.forEach(repo => {
          if (!repo.data.objectId) {
            const name = repo.data.text;
            repo.data.objectId = createdNameRepoMap[name]?.objectId;
          }
        });
      }
    }
  };

  /** 批量新建测试用例 */
  const batchCreateTestCase = async minderData => {
    const traverseCollectTestCaseNode = (node, arr = []) => {
      if (!node) return;
      if (node.data.type === MinderNodeType.TestCase) {
        arr.push(node);
      }
      node.children?.forEach(child => traverseCollectTestCaseNode(child, arr));
      return arr;
    };

    // 事项创建接口必须字段
    const itemRequiredAttrs = await getItemCreateRequiredAttrs({ key: workspaceKey });

    // 构建测试用例数据
    const buildTestCaseItemData = testCaseNodes => {
      const buildItemData = node => {
        const { text: name } = node.data;
        const detail = {
          steps:
            node.children?.reduce((steps, child) => {
              if (child.data.type === MinderNodeType.Step) {
                const step = {
                  id: uuidv4(),
                  action: child.data.text,
                  result: child.children[0]?.data.text,
                  data: child.children[0]?.children[0]?.data.text,
                };
                steps.push(step);
              }
              return steps;
            }, []) ?? [],
          precondition: node.children?.find(
            child => child.data.type === MinderNodeType.Precondition,
          )?.data.text,
        };
        const priority = node.data.priority;
        const repository =
          node.parent?.data.type === MinderNodeType.Module ? node.parent?.data.objectId : null;

        return {
          ...itemRequiredAttrs,
          name,
          detail,
          repository,
          type: TestType.Case,
          values: { priority },
          sortIndex: generateSortIndex(),
        };
      };

      return testCaseNodes.map(buildItemData);
    };

    // 收集所有测试用例节点
    const testCaseNodes = traverseCollectTestCaseNode(minderData);

    // 构建测试用例数据
    const itemData = buildTestCaseItemData(testCaseNodes);

    return batchCreateItems(itemData as any);
  };

  try {
    // 递归遍历脑图数据，添加 parent 和 id 字段
    traverseAddParentMinderData(minderData);

    // 遍历脑图节点，如果 module 类型节点不存在（objectId = null）则创建， 并将新建模块中的 objectId 设置 module 节点的 objectId 字段
    await createRepoAndSetObjectId(minderData);

    // 批量创建测试用例
    const createdTestCases = await batchCreateTestCase(minderData);
    console.info('import success ------>', createdTestCases);
    return buildResponse(`${createdTestCases.length} test case created`);
  } catch (err) {
    console.info('import failed ------>', err);
    return buildResponse(err.message);
  }
};
