/** 排除 subSet 值 */
export const exclude = (targetSet: string[], subSet: string[]) => {
  const subMap = subSet.reduce((map, k) => {
    map.set(k, true);
    return map;
  }, new Map());
  return targetSet?.filter(k => !subMap.has(k)) ?? [];
};

/** 是否全包含 */
export const includeAll = (targetSet: string[], subSet: string[]) => {
  const subMap = subSet.reduce((map, k) => {
    map.set(k, true);
    return map;
  }, new Map());

  targetSet.forEach(k => subMap.delete(k));

  return !Array.from(subMap.keys()).length;
};

/** 是否存在子项 */
export const includeItem = (targetSet: string[], subSet: string[]) => {
  const subMap = subSet.reduce((map, k) => {
    map.set(k, true);
    return map;
  }, new Map());

  return targetSet.some(k => subMap.has(k));
};
