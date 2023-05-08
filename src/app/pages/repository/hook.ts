import React from 'react';
import ReactDOM from 'react-dom';

import { getTreeNodeByKey, reverseTreeNodes, traverseTreeNodes, TreeNode } from './util';

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

/** 增加 header extra action */
export const useHeaderExtraActionButton = button => {
  const [node, setNode] = React.useState(null);
  React.useEffect(() => {
    const container = document.querySelector('#repository-header-extra-action');
    if (container) {
      setNode(ReactDOM.createPortal(button, container));
    }

    return () => {
      if (container) {
        ReactDOM.unmountComponentAtNode(container);
      }
    };
  }, [button]);

  return node;
};
