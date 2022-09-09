/**
 * @file 测试实体数据和事项数据之间相互转换
 */
import omit from 'lodash/omit';
import { ItemValuesStorageKeyMapping } from '../constant';
import { TestEntityKey, BaseTestEntity } from '../types/test';

/** 测试管理实体转换 item values只转换自定义字段。workspace，itemTypes 不进行处理 */
export const testEntityToItemValues = data => {
  /** 特殊字段转换策略，用于处理向 values 中存储时需要转换的处理 */
  const dataTransferStrategy = {} as Record<TestEntityKey, (data) => any>;

  const values = Object.entries(ItemValuesStorageKeyMapping).reduce((res, [key, storageKey]) => {
    const value = data[key];

    const storageValues = value
      ? {
          [storageKey]: dataTransferStrategy[key]?.(value) ?? value,
        }
      : null;

    return {
      ...res,
      ...storageValues,
    };
  }, {});

  return values;
};

/** item 转换为测试管理实体 */
export const itemToTestEntity = item => {
  /** 自定义字段转换策略，用于处理转成 testEntity 的额外处理 */
  const itemValuesTransferStrategy = {} as Record<TestEntityKey, (data) => any>;

  // 混入的事项字段 key
  const MixinFieldKeys = [
    'key',
    'name',
    'values',
    'objectId',
    'objectId',
    'itemType',
    'workspace',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
  ] as const;

  /** 事项字段转换策略， */
  const itemFiledTransferStrategy = {
    values: data => omit(data, Object.values(ItemValuesStorageKeyMapping)),
  } as Record<keyof typeof MixinFieldKeys, (data) => any>;

  // 事项自定义字段
  const values = item.values;

  const testEntity = Object.entries(ItemValuesStorageKeyMapping).reduce(
    (res, [fieldKey, valuesKey]) => {
      const data = values[valuesKey];

      const testEntityData = data
        ? {
            [fieldKey]: itemValuesTransferStrategy[fieldKey]?.(data) ?? data,
          }
        : null;

      return {
        ...res,
        ...testEntityData,
      };
    },
    {},
  ) as BaseTestEntity;

  MixinFieldKeys.forEach(key => {
    const data = item[key];
    testEntity[key] = itemFiledTransferStrategy[key]?.(data) ?? data;
  });

  return testEntity;
};
