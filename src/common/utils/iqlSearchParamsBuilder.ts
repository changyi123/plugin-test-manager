import { PaginationParams } from '../types/api';
import { SystemField, AppKey, TestFiledKeyMapping } from '../constant';
import { default as IQLBuilder, Operator, Composition } from '../../common/utils/iqlBuilder';

export { Operator } from '../../common/utils/iqlBuilder';

type BuildParams = {
  payload: Record<string, any | { value: any; composition?: Composition; operator?: Operator }>;
  /** 限制返回字段 */
  fields?: string[];
} & PaginationParams;

// iql 请求默认返回字段
export const DefaultFields = [
  SystemField.Id,
  SystemField.Key,
  SystemField.Name,
  SystemField.Status,
  SystemField.ItemType,
  SystemField.CreatedAt,
  SystemField.CreatedBy,
  SystemField.Workspace,
  SystemField.Assignee,
  SystemField.Priority,
  // SystemField.UpdatedAt,
  // SystemField.UpdatedBy,
  // 'values',
  // 测试管理自定义字段
  ...Object.values(TestFiledKeyMapping),
];

const searchParamsBuilder = (params: BuildParams) => {
  const { payload, fields = DefaultFields, offset = 0, limit = 10 } = params;

  const iqlBuilder = new IQLBuilder();

  Object.entries(payload).forEach(([key, value]) => {
    if (value) {
      value =
        typeof value === 'object' && Object.hasOwnProperty.call(value, 'value')
          ? [value.value, value.operator, value.composition]
          : [value];
      iqlBuilder.where(key, ...value);
    }
  });

  const iql = iqlBuilder.build();

  console.info('iql search -->', iql);

  return {
    iql,
    size: limit,
    from: offset,
    fields,
    // 隐藏事项需要被查询
    displayContext: AppKey,
  };
};

export default searchParamsBuilder;
