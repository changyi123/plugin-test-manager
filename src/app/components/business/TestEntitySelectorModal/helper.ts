import { clone, pullAll } from 'lodash';

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

export const getCheckedByType = (
  allCaseIds: string[],
  selectIdSet: Set<string>,
  type = 'checked',
) => {
  if (!selectIdSet?.size || !allCaseIds?.length) return false;

  const caseIds = [...selectIdSet];
  const ids = pullAll(clone(allCaseIds), caseIds);
  if (type === 'indeterminate') {
    return allCaseIds?.length !== ids.length;
  }

  return !ids?.length;
};
