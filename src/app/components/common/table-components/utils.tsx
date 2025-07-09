export const TEST_REFERENCE = 'test_reference'; //  引用测试用例
//  todo 下面这个名字先修改下
export const DATA_QUOTE = 'DataQuote'; // 数据引用

export const ALL_CUSTOME_FIELD_COMPONENTS = [TEST_REFERENCE, DATA_QUOTE];
export function isCustomFieldComponent(componentName: string) {
  return ALL_CUSTOME_FIELD_COMPONENTS.includes(componentName);
}
