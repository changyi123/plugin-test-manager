import { pick } from 'lodash';

import { Step } from '@/lib/types/Test';

type ModelLike<T extends Record<string, unknown>> = T & {
  [key: string]: unknown;
};

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
    'actualResult',
    'comment',
  ] as const;

  return pick(step, pickedKey);
};
