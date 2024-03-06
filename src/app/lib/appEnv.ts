import { get } from 'lodash';

/**
 * feature flags 通过应用中心环境变量控制功能
 * 默认功能为开，需要关闭该功能。变量需要以 disable 开头
 * 默认功能为关，需要打开该功能。变量需要以 enable 开头
 **/
export const SupportFeatureFlags = {
  /** 开启测试管理脑图 */
  ENABLE_MINDER: 'ENABLE_MINDER',
  /** 开启测试报告 */
  ENABLE_TEST_REPORT: 'ENABLE_TEST_REPORT',
  /** 开启更多配置 */
  ENABLE_MORE_CONFIG: 'ENABLE_MORE_CONFIG',
  /** 开启离线测试报告 */
  ENABLE_OFFLINE_TEST_REPORT: 'ENABLE_OFFLINE_TEST_REPORT',
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
  /** 脑图大数据量节点模式数量限制，超过该数量隐藏节点 */
  LARGE_NODE_MODE_LIMIT: {
    defaultValue: 1000,
    transformer: (value: string) => Number(value),
  },
  /** 控制哪些用户可以进入页面 */
  PAGE_USER_GUARD: {
    defaultValue: {
      // // 控制哪些用户可以进入页面，config 表示页面配置，如果为空数组表示所有用户都可以进入
      // adminPage: {
      //   blacklist: {
      //     roles: [],
      //   },
      //   resultMessage: '当前配置页面无权限，可通过下载版了解或点击联系我们',
      // },
    },
    transformer: val => val,
  },
  FILE_ENCRYPT_SERVER_BASE_URL: {
    defaultValue: '',
    transformer: val => val,
  },
  ITEM_CREATE_COST: {
    defaultValue: '',
    transformer: val => +val ?? 250,
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
