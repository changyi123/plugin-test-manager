/**
 * 获取 环境变量
 */
export const getEnv = () => {
  return globalThis?.QiankunProps?.context?.env ?? globalThis?.env ?? {};
};
