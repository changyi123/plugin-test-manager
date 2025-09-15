import { get } from 'lodash';

import { CASESNAPSHOT_TYPE } from './constants';

export enum TEST_REPORT_VERSION {
  V0,
  V1,
  V2,
}

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
  /** 开启测试用例集 */
  ENABLE_TEST_CASE_SET: 'ENABLE_TEST_CASE_SET',
  /** 开启更多配置 */
  ENABLE_MORE_CONFIG: 'ENABLE_MORE_CONFIG',
  /** 开启离线测试报告 */
  ENABLE_OFFLINE_TEST_REPORT: 'ENABLE_OFFLINE_TEST_REPORT',
  /**用例展示模式开关 - 用例的展示效果可以通过开关控制是否在列中展示用例的步骤信息*/
  ENABLE_REPOSITORY_TABLE_STEP: 'ENABLE_REPOSITORY_TABLE_STEP',
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
  // 测试用例去重页面配置
  CASE_DUPLICATE_CHECK_CONFIG: {
    defaultValue: {
      // show: true, // 配置是否显示去重页面
      // fieldKey: 'someone', // 通过fieldKey去重用例
    },
    transformer: value => value,
  },
  DELETE_CONFIG: {
    defaultValue: {
      // deleteSize: 10, // 单次删除事项最大数量
      // sleepTime: 1000, // 单次删除事项的休息时间（毫秒）
      // needSleepSize: 100, // 大于给定值时，单次删除事项后，休息sleepTime
    },
    transformer: value => value,
  },
  CHECK_RUN_FOR_DELETE_EXECUTION: {
    defaultValue: false,
    transformer: val => val,
  },
  GROUP_REQUIRED_WHEN_VALIDATE: {
    defaultValue: false,
    transformer: val => val,
  },
  CHECK_CASE_FOR_DELETE_REPOSITORY: {
    defaultValue: false,
    transformer: value => value,
  },
  TEST_REPORT_VERSION: {
    defaultValue: TEST_REPORT_VERSION.V2,
    transformer: value => value,
  },
  CREATE_EXECUTION_DEFAULT_NAME_CONFIG: {
    defaultValue: {
      enable: false, // 是否开启默认名称配置
      suffixName: '测试单', // 默认的后缀名
    },
    transformer: value => value,
  },
  // 改变测试执行状态时校验步骤
  CHECK_STEP_FOR_CHANGE_RUN_STATUS: {
    defaultValue: false,
    transformer: value => value,
  },
  // 默认隐藏创建按钮的类型
  CREATE_HIDDEN_TYPE: {
    defaultValue: [],
    transformer: value => value,
  },
  ZGC_CONFIG: {
    defaultValue: {
      测试环境: 'bchj',
      测试阶段: 'ceshijieduan',
      enable: false,
    },
    transformer: value => value,
  },
  EXTENSION_SLOT_DATA_WEB_KEY: {
    defaultValue: '',
    transformer: value => value,
  },

  EXPORT_REPORT_PARALLEL_SIZE: {
    defaultValue: 6,
    transformer: value => Number(value),
  },

  DEFAULT_ENABLED_CASE_SNAPSHOT: {
    defaultValue: false,
    transformer: value => value,
  },
  ENABLED_CASE_SNAPSHOT: {
    defaultValue: false,
    transformer: value => value,
  },
  ENABLED_TESTPLAN_USE_EDITOR: {
    defaultValue: false,
    transformer: value => value,
  },
  alias: {
    defaultValue: {},
    transformer: value => value,
  },
  ENABLE_JSON_IMPORT: {
    defaultValue: false,
    transformer: value => value,
  },
  ENABLE_IMPORT_SNAP_SHOT_CONFIG: {
    defaultValue: false,
    transformer: value => value,
  },
  HIDDEN_TABLE_FIELD_CONFIG: {
    defaultValue: false,
    transformer: value => value,
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

/**
 * 判断测试报告版本
 */
export function judgeTestReportVersion(version: TEST_REPORT_VERSION | TEST_REPORT_VERSION[]) {
  return Array.isArray(version)
    ? version.includes(getAppEnv('TEST_REPORT_VERSION'))
    : getAppEnv('TEST_REPORT_VERSION') === version;
}

/**
 * 判断是否开启规划用例自动打快照
 */
export function judgeCaseSnapshot(testConfig) {
  return getAppEnv('ENABLED_CASE_SNAPSHOT')
    ? [CASESNAPSHOT_TYPE.AUTO_BUILDVERSION].includes(testConfig?.caseSnapshot?.type)
    : getAppEnv('DEFAULT_ENABLED_CASE_SNAPSHOT');
}

export function isTestPlanUseEditor() {
  return getAppEnv('ENABLED_TESTPLAN_USE_EDITOR');
}
