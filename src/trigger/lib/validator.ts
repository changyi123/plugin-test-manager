/* eslint-disable no-fallthrough */
import { TestFiledKeyKeys, TestLinkType, TestType } from '../../common/constant';

export const throwArgumentError = (key, expectedType?: string) => {
  throw new Error(
    `The ${key} data-type is error. ${expectedType ? `Expected ${expectedType}` : ''}`,
  );
};

export const throwMissingFieldError = key => {
  throw new Error(`The ${key} field is Required.`);
};
/** 需要校验的字段 */
const ValidateFields = ['detail', 'runDetail', ...TestFiledKeyKeys] as (
  | (typeof TestFiledKeyKeys)[0]
  | 'detail'
  | 'runDetail'
)[];

/** 校验测试字段 */
export const testEntityFieldTypeValidator = data => {
  Object.entries((data ?? {}) as Record<string, any>).forEach(([key, value]) => {
    const fieldKey = key as (typeof ValidateFields)[0];
    // 测试自定义字段校验
    if (ValidateFields.includes(fieldKey)) {
      if (fieldKey === 'linkItems') {
        // 校验 value 非 null，null 情况属于删除关系
        Array.isArray(value) || value === null || throwArgumentError('linkItems', 'objectId[]');
      } else if (fieldKey === 'linkType') {
        Object.values(TestLinkType).includes(value) ||
          value === null ||
          throwArgumentError(key, 'TestLinkType Enum');
      } else if (fieldKey === 'type') {
        Object.values(TestType).includes(value) || throwArgumentError(key, 'TestType Enum');
      } else if (['detail', 'runDetail'].includes(fieldKey)) {
        (value && typeof value === 'object') || throwArgumentError(key);
      }
    }
  });
};

/** 新建测试实体必填数据校验 */
export const testEntityInitRequiredValidator = data => {
  if (!data.type) throwMissingFieldError('type');
};
