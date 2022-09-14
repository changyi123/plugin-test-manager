/* eslint-disable no-fallthrough */
import { TestType, TestLinkType, TestFiledKeyKeys } from '../../common/constant';

const throwBadRequest = (key, expectedType?: string) => {
  throw new Error(`The ${key} is invalid. ${expectedType ? `Expect ${expectedType}` : ''}`);
};

/** 需要校验的字段 */
const ValidateFields = ['detail', 'runDetail', ...TestFiledKeyKeys] as (
  | typeof TestFiledKeyKeys[0]
  | 'detail'
  | 'runDetail'
)[];

/** 校验测试字段 */
export const validateTestEntityFields = data => {
  // 校验
  Object.entries((data ?? {}) as Record<string, any>).forEach(([key, value]) => {
    const fieldKey = key as typeof ValidateFields[0];
    // 测试自定义字段校验
    if (ValidateFields.includes(fieldKey)) {
      switch (fieldKey) {
        case 'linkItems':
          if (!Array.isArray(value)) {
            throwBadRequest('linkItems', 'string[]');
          }
        case 'linkType':
          if (Object.values(TestLinkType).includes(value))
            throwBadRequest('linkType', 'TestLinkType Enum');
        case 'type':
          if (Object.values(TestType).includes(value)) throwBadRequest('type', 'TestType Enum');
      }
    }
  });
};
