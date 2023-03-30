import { clone, pullAll, sum } from 'lodash';

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
    if (!ids?.length) return false;
    return allCaseIds?.length !== ids.length;
  }

  return !ids?.length;
};

export const getGroupNameByKey = (
  group: Map<string, Record<string, any>>,
  key: string,
  groupName?: string,
) => {
  if (!key) return;
  const curNode = group.get(key);
  if (!curNode) return;
  groupName = curNode?.name;

  if (curNode.parentKey) {
    const parentNodeName = getGroupNameByKey(group, curNode.parentKey);
    groupName = `${parentNodeName ? parentNodeName + '/' : ''}${groupName}`;
  }

  return groupName;
};

export const handleGroupPath = (group: Map<string, Record<string, any>>, key: string) => {
  const pathName = getGroupNameByKey(group, key);
  const pathGroup = pathName.split('/');
  if (pathGroup?.length <= 1) return pathName;
  const name = pathGroup.splice(-1);
  return [pathGroup.join('/'), name];
};

export const handleCounts = (counts?: number[]) => {
  let a: number[] = [];
  const getPrev = num => {
    const b = new Array(Math.floor(num / 100)).fill([100]);
    const c = num % 100;

    return [b, c];
  };
  const data = counts.reduce((prev, cur) => {
    if (sum(a) + cur < 100) {
      a = a.concat(cur);
    } else {
      const b = 100 - sum(a);
      a = a.concat(b);
      prev.push(a);
      if (cur - b > 100) {
        const [c, d] = getPrev(cur - b);
        prev = prev.concat(c);
        a = [d as number];
      } else {
        a = cur - b ? [cur - b] : [];
      }
    }
    return prev;
  }, []);

  if (a?.length) {
    data.push(a);
  }

  return data;
};

export const filterIgnoreTestCaseId = (caseIdSet, IgnoreIdSet) => {
  const newCaseIdSet = new Set([...(caseIdSet ?? [])]);

  newCaseIdSet.forEach(d => {
    IgnoreIdSet?.has(d) && newCaseIdSet.delete(d);
  });

  return [...newCaseIdSet];
};
