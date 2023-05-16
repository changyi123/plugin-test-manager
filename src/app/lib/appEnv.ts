import { get } from 'lodash';

/**
 * feature flags 通过应用中心环境变量控制功能
 * 默认功能为开，需要关闭该功能。变量需要以 disabled 开头
 * 默认功能为关，需要打开该功能。变量需要以 enable 开头
 **/
const SupportFeatureFlags = {
  /** 隐藏测试管理脑图 */
  DISABLE_MINDER: 'DISABLE_MINDER',
} as const;

type SupportFeatureFlagKey = keyof typeof SupportFeatureFlags;

export function featureFlags(flags: SupportFeatureFlagKey): boolean;
export function featureFlags<T extends SupportFeatureFlagKey[]>(
  flags: T,
): { [k in keyof T]: boolean };

/**
 * 获取功能开关，支持单个 flag 和多个 flag
 */
export function featureFlags(flags: SupportFeatureFlagKey | SupportFeatureFlagKey[]) {
  const featureFlags = Array.isArray(window.QiankunProps?.context?.env?.FEATURE_FLAGS)
    ? window.QiankunProps?.context?.env?.FEATURE_FLAGS
    : [];

  if (Array.isArray(flags)) {
    const supportFeatureFlags = Object.keys(SupportFeatureFlags) as SupportFeatureFlagKey[];
    return flags.reduce((acc, flag) => {
      if (!supportFeatureFlags.includes(flag)) return acc;

      return {
        ...acc,
        [flag]: featureFlags.includes(SupportFeatureFlags[flag]),
      };
    }, {} as any);
  } else {
    return featureFlags.includes(SupportFeatureFlags[flags]);
  }
}

const SupportAppEnv = {
  /** 脑图节点最大渲染数量 */
  MAX_RENDER_NODE_COUNT: {
    defaultValue: 250,
    transformer: (value: string) => Number(value),
  },
} as const;

/**
 * 获取环境变量值
 */
export function getAppEnv(key: keyof typeof SupportAppEnv) {
  if (!Object.keys(SupportAppEnv).includes(key)) return null;
  const envConfig = SupportAppEnv[key];
  const variable = get(window.QiankunProps?.context?.env, key);
  if (variable == null) return envConfig.defaultValue;
  return typeof envConfig?.transformer === 'function' ? envConfig.transformer(variable) : variable;
}
