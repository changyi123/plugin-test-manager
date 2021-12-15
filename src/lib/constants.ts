// 测试管理事件默认 key
export const TEST_MANAGER_PLUGIN_KEY = 'test-manager';

// proxima sdk 底座 event key
export enum PROXIMA_EVENT_KEY {
  openItemCreateScreen = 'openItemCreateScreen',
  openItemViewScreen = 'openItemViewScreen',
  itemSaveSuccess = 'itemSaveSuccess',
}

// 测试类型
export enum TestType {
  // 测试用例
  TestDetail = 'TestDetail',
  TestSet = 'TestSet',
  TestPlan = 'TestPlan',
  Precondition = 'Precondition',
  TestExecution = 'TestExecution',
  TestRuns = 'TestRuns',
}

// 测试实体类型关联关系 (from)Rel(to)
export enum TestRelationType {
  // 测试用例关联测试运行（1:1）
  DetailRelRun = 'DetailRelRun',
  // 测试执行关联测试运行(1:N)
  ExecutionRelRun = 'ExecutionRelRun',
  // 测试计划关联测试用例(1:N)
  PlanRelDetail = 'PlanRelDetail',
  // 测试计划关联测试执行(1:N)
  PlanRelExecution = 'PlanRelExecution',

  // TODO: 测试集合
}
