import React from 'react';
import { hasArrayItem } from '@/lib/utils/helper';

type TreeNode = {
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
      currentNode = nodeKeyMap[currentNode.parentId];
    }
  }
};

// 获取树操作方法
export const useTreeFn = (nodes: TreeNode[]) => {
  return React.useMemo(() => {
    return {
      traverseTreeNodes: traverseTreeNodes.bind(null, nodes),
      getTreeNodeByKey: getTreeNodeByKey.bind(null, nodes),
      reverseTreeNodes: reverseTreeNodes.bind(null, nodes),
    };
  }, [nodes]);
};

/** 获取布局高度 */
export const useLayoutHeight = () => {
  const offsetY = 20;
  const [height, setHeight] = React.useState(700);

  React.useEffect(() => {
    const layoutElement = document.querySelector('[data-element-id="workspace.layout.content"]');

    if (layoutElement) {
      // 删除 child 节点的 padding
      const workspacePluginContainerDOM = layoutElement.children?.[0] ?? ({} as any);
      workspacePluginContainerDOM.style = 'padding: 0';
      setHeight(layoutElement.clientHeight - offsetY);
    }
  }, []);
  return height;
};
