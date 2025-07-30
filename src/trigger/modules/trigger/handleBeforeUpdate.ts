import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';

import { CASE_IS_UPDATE, TestFiledKeyMapping, TestType } from '../../../common/constant';
const valueBase = 'values.';
// 已经和产品确认，只需要比较前置条件，步骤等字段就可以
const INCLUDE_FIELD = [valueBase + TestFiledKeyMapping.detail];
/**
 * 标准化路径格式（将数组路径转换为字符串路径）
 * @param {string|string[]} path - 路径（支持 'a.b.c' 或 ['a', 'b', 'c'] 形式）
 * @returns {string} 标准化后的字符串路径（如 'a.b.c'）
 */
function normalizePath(path) {
  if (Array.isArray(path)) {
    // 过滤数组中的无效值（非字符串类型）
    return path.filter(part => typeof part === 'string' && part).join('.');
  }
  // 对于字符串路径，直接返回（空字符串会被后续处理忽略）
  return typeof path === 'string' ? path : '';
}

/**
 * 从对象中选取指定的嵌套路径属性（支持字符串和数组两种路径形式）
 * @param {Object} obj - 源对象
 * @param {(string|string[]|(string|string[])[])} paths - 要选取的路径数组
 * @returns {Object} 包含选取属性的新对象
 */
function nestedPick(obj, paths) {
  // 确保paths是数组
  const pathList = Array.isArray(paths) ? paths : [paths];

  return pathList.reduce((result, path) => {
    // 标准化路径为字符串形式
    const normalizedPath = normalizePath(path);

    // 跳过无效路径
    if (!normalizedPath) return result;

    // 获取源对象中该路径的值
    const value = get(obj, normalizedPath);
    // 设置到结果对象的对应路径
    set(result, normalizedPath, value);

    return result;
  }, {});
}

/**
 * 对比两个对象是否有差异。 只比较执行步骤，前置条件等字段
 * @param item
 * @param originalItem
 * @returns
 */
const isUpdate = (item, originalItem) => {
  const newItem = nestedPick(item, INCLUDE_FIELD);
  const originItem = nestedPick(item, originalItem);
  const isSame = isEqual(newItem, originItem);
  return !isSame;
};

export const handleBeforeUpdate = async () => {
  const { item, originalItem } = global as any;
  if (originalItem.values.r_test_manager_type !== TestType.Case) return;

  console.info('事项更新前：', JSON.stringify(item), JSON.stringify(originalItem));
  console.info('事项是否更新：', isUpdate(item, originalItem));
  if (!isUpdate(item, originalItem)) return;
  item.values = {
    ...item.values,
    [TestFiledKeyMapping.isCaseUpdate]: CASE_IS_UPDATE.YES,
  };
  console.info('事项更新后：', JSON.stringify(item));
  return {
    item,
  };
};
