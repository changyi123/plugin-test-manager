import { hasArrayItem } from '@/lib/utils/helper';

export type TreeNode = {
  key: string;
  children: TreeNode[];
  [key: string]: any;
};

/**
 * 遍历树节点
 */
export const traverseTreeNodes = (nodes: TreeNode[], cb?: (node: TreeNode) => TreeNode | void) => {
  if (!hasArrayItem(nodes)) return;
  nodes.forEach(node => {
    const newNode = cb?.(node);
    if (newNode) {
      node = newNode;
    }
    traverseTreeNodes(node.children, cb);
  });
  return nodes;
};

/**
 * 获取树节点
 */
export const getTreeNodeByKey = (nodes: TreeNode[], key) => {
  let result = null;
  traverseTreeNodes(nodes, node => {
    if (node.key === key) {
      result = node;
    }
  });
  return result;
};

/**
 * 逆向遍历树节点
 */
export const reverseTreeNodes = (
  nodes: TreeNode[],
  currentNode: TreeNode,
  cb: (node: TreeNode) => void,
) => {
  const nodeKeyMap = {};
  traverseTreeNodes(nodes, node => {
    Object.assign(nodeKeyMap, { [node.key]: node });
  });

  // 逆向遍历查找 node 节点 name
  while (currentNode) {
    if (currentNode) {
      cb(currentNode);
      currentNode = nodeKeyMap[currentNode.parentKey];
    }
  }
};

/** 在用例库层级中增加用例库分组 */
export const appendGroupedDetailIdsToTreeNode = (treeNodes, testDetails) => {
  const UnGroupedKey = '__UNGROUPED';
  const repoRelTestDetailMap = new Map();

  testDetails.forEach(test => {
    const repositoryKey = test.repository ?? UnGroupedKey;
    if (!repoRelTestDetailMap.has(repositoryKey)) {
      repoRelTestDetailMap.set(repositoryKey, new Set());
    }
    repoRelTestDetailMap.get(repositoryKey).add(test.objectId);
  });

  traverseTreeNodes(treeNodes, node => {
    const nodeKey = node.key;
    if (repoRelTestDetailMap.has(nodeKey)) {
      node.testDetailIds = Array.from(repoRelTestDetailMap.get(nodeKey));
      repoRelTestDetailMap.delete(nodeKey);
    } else {
      node.testDetailIds = [];
    }
  });

  // 处理未分组用例

  let ungroupedTestDetailIds = [];

  const iterator = repoRelTestDetailMap.values();
  for (const detailSet of iterator) {
    ungroupedTestDetailIds = ungroupedTestDetailIds.concat(Array.from(detailSet));
  }

  return Array.from(new Set(ungroupedTestDetailIds));
};
