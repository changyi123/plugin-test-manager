import { keyBy } from 'lodash';
import { v4 as uuid } from 'uuid';

import { Input } from './fields';
import Editor from './fields/editor';

/** 渲染组件映射 */
export const FieldComponentMapping = {
  input: Input,
  editor: Editor,
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
// t('components.business.testStep.stepField.0')
export const StepFieldImpl = [
  {
    key: 'action',
    title: 'stepField.0',
    type: 'editor',
  },
  {
    key: 'result',
    title: 'stepField.1',
    type: 'editor',
  },
  {
    key: 'data',
    title: 'stepField.2',
    type: 'editor',
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

export const getFields = fields => {
  const fieldDataMapping = keyBy(fields, 'key');

  return StepFieldImpl.map(impl => {
    const fieldData = fieldDataMapping[impl.key];

    return Object.assign(
      {
        ...impl,
        component: FieldComponentMapping[impl.type],
      },
      fieldData,
    );
  });
};

/** 获取事项详情页面 */
export const getItemDetailPaneContainer = () => {
  return document.querySelector('#view-item-detail-drawer') as HTMLElement;
};

export { getRootContainer } from '@/lib/utils/helper';
