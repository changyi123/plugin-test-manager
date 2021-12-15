import BaseTable, { AutoResizer } from 'react-base-table';
import { useSDK } from '@projectproxima/plugin-sdk';
import { noop } from 'lodash';

// 组件占位符，防止运行时报错
const nilComponents = new Proxy(
  {
    Table: BaseTable,
    AutoResizer,
  },
  {
    get: (target, prop) => {
      return target[prop] ?? (() => null);
    },
  },
);

// 方法变量占位符
const nilMethods = new Proxy({}, { get: noop });

/**
 * 获取 proxima table toolkit
 */
export const useProximaTableToolkit = () => {
  const { context } = useSDK();
  const toolkit = context?.toolkit ?? {
    table: { components: nilComponents, methods: nilMethods },
  };

  return toolkit.table;
};
