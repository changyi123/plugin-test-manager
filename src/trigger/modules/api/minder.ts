import keyBy from 'lodash/keyBy';
import uniqueId from 'lodash/uniqueId';
import { uuidv4 } from '../../lib/helper';
import { generateSortIndex } from '../../lib/helper';
import { getRepositoryTree } from '../../lib/repository';
import { batchCreateItems } from '../../lib/batchRequest';
import { getItemCreateRequiredAttrs } from '../../lib/item';
import { itemToTestEntity } from '../../../common/utils/dataTransfer';
import { getParseModel, saveAllObject } from '@giteeteam/apps-team-api';
import { getReqInfoFromVMRuntime, buildResponse } from '../../lib/apiUtil';
import { MinderDataPayload, MinderDataImportPayload } from '../../../common/types/api';
import {
  TestType,
  SystemField,
  MinderNodeType,
  TestFiledKeyMapping,
  RepositoryClassName,
} from '../../../common/constant';

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

/** 测试管理脑图数据导入 */
export const minderDataImport = async () => {
  const { body, sessionToken } = getReqInfoFromVMRuntime<MinderDataImportPayload>();
  const { workspaceKey, minderData } = body;

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
    const RepoModel = await getParseModel(false, RepositoryClassName);
    for (const levelOrder of levelOrderArr) {
      const repoData = levelOrder.filter(node => node.data.type === MinderNodeType.Module);
      // 需要被创建的 repository
      const needCreateRepoData = repoData.filter(node => !node.data.objectId);
      const repoParseObjects = needCreateRepoData.map((repo, index) => {
        const parentRepoId = repo.parent?.data.objectId;
        return new RepoModel({
          workspaceKey,
          name: repo.data.text,
          parent: RepoModel.createWithoutData(parentRepoId),
          sortIndex: generateSortIndex(index),
        });
      });
      if (repoParseObjects.length) {
        const createdRepos = await saveAllObject(repoParseObjects, { sessionToken }).then(items =>
          items.map(item => item.toJSON()),
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
          preCondition: node.children?.find(
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
    return buildResponse(createdTestCases.map(itemToTestEntity));
  } catch (err) {
    return buildResponse(err);
  }
};
