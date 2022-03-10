/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import { hasArrayItem } from '@/lib/utils/helper';
type TreeNode = {
  key: string;
  children: TreeNode[];
  [key: string]: any;
};

//arr to tree 1
export function nodesToTree(list: any[], pid: any = undefined) {
  const newArr = list.filter(item => {
    return item?.attributes?.parent?.id == pid;
  });
  newArr.forEach(item => {
    //输入父一级的pid，找子一级
    item.children = nodesToTree(list, item?.id);
  });
  return newArr;
}
//tree to arr
export const treeToChildren = tree => {
  const result = [];
  const flat = nodes => {
    if (!nodes || nodes.length === 0) return;
    nodes.forEach(node => {
      // const obj = { [node?.key]:  };
      result.push(node?.testDetailIds ?? []);
      if (node?.children) {
        flat(node.children);
      }
    });
  };
  flat(tree);
  return result;
};

//unique base data
export function unique(arr) {
  return Array.from(new Set(arr));
}

//arr to tree
/**
 * @description 一维数组格式转化为tree格式
 * @param {Array}  一维数组
 * @return {Array} 多维数组
 * @复杂度 O(2n)
 */
export function arrayToTree(treeArray: any[]): any[] {
  const r = [],
    tmpMap = {};

  for (let i = 0, l = treeArray.length; i < l; i++) {
    // 以每条数据的id作为obj的key值，数据作为value值存入到一个临时对象里面
    tmpMap[treeArray[i].key] = treeArray[i];
  }

  for (let i = 0, l = treeArray.length; i < l; i++) {
    const key = tmpMap[treeArray[i].parentId];

    // 循环每一条数据的pid，假如这个临时对象有这个key值，就代表这个key对应的数据有children，需要Push进去
    if (key) {
      if (!key.children) {
        key.children = [];
        key.children.push(treeArray[i]);
      } else {
        key.children.push(treeArray[i]);
      }
    } else {
      // 如果没有这个Key值，那就代表没有父级,直接放在最外层
      r.push(treeArray[i]);
    }
  }
  return r;
}

//tree  to nodes
export const traverseTreeNodes = (nodes: TreeNode[], cb?: (node: TreeNode) => TreeNode | void) => {
  if (!hasArrayItem(nodes)) return;
  nodes.forEach(node => {
    const newNode = cb(node);
    if (!node.title) node.title = node.name;
    if (newNode) {
      node = newNode;
    }
    traverseTreeNodes(node.children, cb);
  });
  return nodes;
};
