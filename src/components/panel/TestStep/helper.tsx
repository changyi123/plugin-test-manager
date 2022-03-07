import { keyBy } from 'lodash';
import { Input } from './fields';
import { v4 as uuid } from 'uuid';

/** 渲染组件映射 */
export const FieldComponentMapping = {
  input: Input,
};

/** 内置字段 key */
export const BuiltinFieldKeys = ['action', 'result', 'data'];

/** 生成初始化步骤数据 */
export const getStepInitialData = (callTestId?: string) => {
  const template = {
    id: uuid(),
  };

  if (callTestId) {
    return Object.assign({}, template, { callTestId });
  }
  return Object.assign({}, template, { data: '', result: '', action: '', customFields: [] });
};

/** 步骤字段渲染数据 */
export const StepFieldImpl = [
  {
    key: 'action',
    title: '步骤',
    type: 'input',
  },
  {
    key: 'result',
    title: '预期',
    type: 'input',
  },
  {
    key: 'data',
    title: '数据',
    type: 'input',
  },
];

/** 获取表单字段 column */
export const getFieldByImpl = field => {
  // 目前只支持自定义字段
  const fieldsMapping = keyBy(StepFieldImpl, 'key');

  const impl = fieldsMapping[field.key];
  if (!impl) return null;

  return Object.assign(
    {
      ...impl,
      component: FieldComponentMapping[impl.type],
    },
    field,
  );
};

export { getRootContainer } from '@/lib/utils/helper';
