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
    const key = tmpMap[treeArray[i].parentKey];

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
