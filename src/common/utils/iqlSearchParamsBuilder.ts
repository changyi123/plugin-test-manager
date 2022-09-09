import { PaginationParams } from '../types/api';
import { SystemField, AppKey } from '../constant';
import { default as IQLBuilder, Operator } from '../../common/utils/iqlBuilder';

type BuildParams = {
  payload: Record<string, any | [any, Operator]>;
  /** 限制返回字段 */
  fields?: string[];
} & PaginationParams;

// iql 请求默认返回字段
export const DefaultFields = [
  'values',
  'objectId',
  SystemField.Key,
  SystemField.Name,
  SystemField.Status,
  SystemField.ItemType,
  SystemField.CreatedAt,
  SystemField.CreatedBy,
  SystemField.Workspace,
] as const;

const searchParamsBuilder = (params: BuildParams) => {
  const { payload, fields = DefaultFields, offset = 0, limit = 10 } = params;

  const iqlBuilder = new IQLBuilder();

  Object.entries(payload).forEach(([key, value]) => {
    if (value) {
      value = Array.isArray(value) ? value : [value];
      iqlBuilder.where(key, ...value);
    }
  });

  const iql = iqlBuilder.build();

  console.info('iql ------>', iql);

  return {
    iql,
    size: limit,
    from: offset,
    fields: fields,
    displayContext: AppKey,
  };
};

export default searchParamsBuilder;
