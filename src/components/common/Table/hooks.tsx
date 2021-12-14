import { useSDK } from '@projectproxima/plugin-sdk';

/** 本地环境启动占位符 */
const ToolkitTablePlaceholder = {
  components: new Proxy(
    {},
    {
      get: () => () => null,
    },
  ),
};

/**
 * 获取 proxima table toolkit
 */
export const useProximaTableToolkit = () => {
  const { context } = useSDK();
  const toolkit = context?.toolkit ?? {
    table: ToolkitTablePlaceholder,
  };

  return toolkit.table;
};
