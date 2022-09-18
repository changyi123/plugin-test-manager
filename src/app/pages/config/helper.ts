import { TestType, BuiltinItemTypeMapping } from '@/lib/constants';

/** 获取默认测试配置数据 */
export const generateDefaultTestConfig = (workspaceKey: string, isolatedSystem = false) => {
  return {
    workspaceKey,
    global: false,
    itemTypeMap: isolatedSystem ? BuiltinItemTypeMapping : {},
    defectsMapping: [],
    // 默认所有事项都加上空间隔离
    isolateTestType: [TestType.Plan, TestType.TestDefect, TestType.Case, TestType.Execution],
  };
};
