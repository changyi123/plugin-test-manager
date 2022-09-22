/**
 * @file 测试实体数据和事项数据之间相互转换
 */
import omit from 'lodash/omit';
import isNil from 'lodash/isNil';
import omitBy from 'lodash/omitBy';
import { TestFiledKeyMapping } from '../constant';
import { TestEntityKey, BaseTestEntity } from '../types/test';

/** 转换为 JS 对象或数组 */
const convertToPlainJSData = data => {
  try {
    return JSON.parse(data);
  } catch (e) {
    return undefined;
  }
};

/** 转换为 JS 对象或数组 */
const convertToJSONStr = data => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return '';
  }
};

export const compactNilValue = data => {
  return omitBy(data, isNil);
};

/** 测试管理实体转换 item values只转换自定义字段。workspace，itemTypes 不进行处理 */
export const testEntityToItemValues = data => {
  /** 特殊字段转换策略，用于处理向 values 中存储时需要转换的处理 */
  const dataTransferStrategy = {
    runDetail: convertToJSONStr,
    detail: convertToJSONStr,
    comment: convertToJSONStr,
  } as Record<TestEntityKey, (data) => any>;

  const values = Object.entries(TestFiledKeyMapping).reduce((res, [key, storageKey]) => {
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

  return compactNilValue(values);
};

/** item 转换为测试管理实体 */
export const itemToTestEntity = item => {
  /** 自定义字段转换策略，用于处理转成 testEntity 的额外处理 */
  const itemValuesTransferStrategy = {
    // 以下三个字段需要进行序列化，存储是以字符串存，防止 es 创建索引时定义默认类型
    detail: convertToPlainJSData,
    comment: convertToPlainJSData,
    runDetail: convertToPlainJSData,
  } as Record<TestEntityKey, (data) => any>;

  // 混入的事项字段 key
  const MixinFieldKeys = [
    'id',
    'key',
    'name',
    'values',
    'status',
    'objectId',
    'itemType',
    'itemGroup',
    'workspace',
    'createdAt',
    'createdBy',
    // 'updatedAt',
    // 'updatedBy',
  ] as const;

  // 重写混入的 key
  const RewriteFieldKey = {
    status: 'workflowStatus',
  };

  /** 事项字段转换策略， */
  const itemFiledTransferStrategy = {
    values: data => omit(data, Object.values(TestFiledKeyMapping)),
  } as Record<keyof typeof MixinFieldKeys, (data) => any>;

  // 事项自定义字段
  const values = item.values;

  const testEntity = Object.entries(TestFiledKeyMapping).reduce((res, [fieldKey, valuesKey]) => {
    const data = values?.[valuesKey];

    const testEntityData = data
      ? {
          [fieldKey]: itemValuesTransferStrategy[fieldKey]?.(data) ?? data,
        }
      : null;

    return {
      ...res,
      ...testEntityData,
    };
  }, {}) as BaseTestEntity;

  MixinFieldKeys.forEach(key => {
    const data = item[key];
    const processedValue = itemFiledTransferStrategy[key]?.(data) ?? data;
    if (processedValue) {
      if (Object.keys(RewriteFieldKey).includes(key)) {
        testEntity[RewriteFieldKey[key]] = processedValue;
      } else {
        testEntity[key] = processedValue;
      }
    }
  });

  return testEntity;
};
