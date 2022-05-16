import React from 'react';
import { TreeNode, traverseTreeNodes, getTreeNodeByKey, reverseTreeNodes } from './util';

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
