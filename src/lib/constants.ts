// 测试管理事件默认 key
export const TEST_MANAGER_PLUGIN_KEY = 'test-manager';

// 初始状态
export const INITIAL_STATUS_KEY = 'TODO';

// ENTITY NOT FOUND
export const ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND';

// proxima sdk 底座 event key
export enum PROXIMA_EVENT_KEY {
  openItemCreateScreen = 'openItemCreateScreen',
  openItemViewScreen = 'openItemViewScreen',
  itemSaveSuccess = 'itemSaveSuccess',
}

// 测试类型
export enum TestType {
  // 测试用例
  // TestSet = 'TestSet',
  // Precondition = 'Precondition',

  TestDetail = 'TestDetail',
  TestPlan = 'TestPlan',
  TestExecution = 'TestExecution',
  TestRun = 'TestRun',

  // 测试缺陷
  TestDefect = 'TestDefect',
}

// 测试实体类型关联关系 (from)Rel(to)
export enum TestRelationType {
  // 测试用例关联测试执行（1:1）
  DetailRelExecution = 'DetailRelExecution',
  // 测试执行轮次关联测试执行(1:N)
  ExecutionRelRun = 'ExecutionRelRun',
  // 测试计划关联测试用例(1:N)
  PlanRelDetail = 'PlanRelDetail',
  // 测试计划关联测试执行轮次(1:N)
  PlanRelExecution = 'PlanRelExecution',

  // TODO: 测试集合
}

export const TestTypeNameMapping = {
  [TestType.TestDetail]: '测试用例',
  [TestType.TestPlan]: '测试计划',
  [TestType.TestExecution]: '测试执行轮次',
  [TestType.TestRun]: '测试执行',
  [TestType.TestDefect]: '缺陷',
};
