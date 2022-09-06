export const AppKey = 'test_manager' as const;

/** 测试关联类型 */
export const TestLinkType = {
  /** 测试用例关联计划（N:1）*/
  CaseLinkPlan: 'CaseLinkPlan',
  /** 测试执行关联测试执行任务（N:1）*/
  RunLinkExecution: 'RunLinkExecution',
  /** 测试执行任务关联测试计划（N:1）*/
  ExecutionLinkPlan: 'ExecutionLinkPlan',
} as const;
