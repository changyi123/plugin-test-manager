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
  Test = 'Test',
  TestSet = 'TestSet',
  TestPlan = 'TestPlan',
  Precondition = 'Precondition',
  TestExecution = 'TestExecution',
}
