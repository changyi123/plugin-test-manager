import { AppKey } from '../constant';
import { PaginationParams } from '../types/api';
import { default as IQLBuilder, Operator, Composition } from '../../common/utils/iqlBuilder';

export { Operator } from '../../common/utils/iqlBuilder';

type BuildParams = {
  /** 排序 */
  order?: string[];
  payload: Record<string, any | { value: any; composition?: Composition; operator?: Operator }>;
  /** 限制返回字段 */
  fields?: string[];
  /** iql and 子句 */
  andCompositionIqlStr?: string;
} & PaginationParams;

export const iqlSearchParamsBuilder = (params: BuildParams) => {
  const { payload, fields, offset = 0, limit = 10, order, andCompositionIqlStr } = params;

  const iqlBuilder = new IQLBuilder();

  // selector 条件可能带有 order by，需要移除 order by 和 空白
  const andIqlStr = andCompositionIqlStr
    ?.replace(/order by.*$/i, '')
    ?.replace(/^\s+/, '')
    ?.replace(/\s+$/, '');

  if (andIqlStr) {
    iqlBuilder.where(andIqlStr, null, null, Composition.And);
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (value) {
      value =
        typeof value === 'object' && Object.hasOwnProperty.call(value, 'value')
          ? [value.value, value.operator, value.composition]
          : [value];
      iqlBuilder.where(key, ...value);
    }
  });

  order.forEach(o => {
    iqlBuilder.order(o);
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

export default iqlSearchParamsBuilder;
