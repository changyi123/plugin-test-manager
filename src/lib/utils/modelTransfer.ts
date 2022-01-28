import { pick } from 'lodash';
import { Step } from '@/lib/types/Test';

type ModelLike<T extends Record<string, unknown>> = T & {
  [key: string]: unknown;
};

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

/** 剔除 ui 数据 */
export const compactStepModel = (step: ModelLike<Step>): Step => {
  const pickedKey = [
    'id',
    'data',
    'action',
    'result',
    'status',
    'callTestId',
    'attachments',
    'customFields',
    'defectItemIds',
  ] as const;

  // 校验提取类型是否全匹配
  type TypeCheck<Key extends keyof Step> = Key;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type T = TypeCheck<ArrayElement<typeof pickedKey>>;

  return pick(step, pickedKey);
};
