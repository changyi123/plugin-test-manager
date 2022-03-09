// 测试管理事件默认 key
export const TEST_MANAGER_PLUGIN_KEY = 'test-manager';

// 初始状态
export const INITIAL_STATUS_KEY = 'TODO';
// 通过类型
export const PASS_STATUS_TYPE = 'PASSED';

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
  // 测试执行任务关联测试执行(1:N)
  ExecutionRelRun = 'ExecutionRelRun',
  // 测试计划关联测试用例(1:N)
  PlanRelDetail = 'PlanRelDetail',
  // 测试计划关联测试执行任务(1:N)
  PlanRelExecution = 'PlanRelExecution',

  // TODO: 测试集合
}

export const TestTypeNameMapping = {
  [TestType.TestDetail]: '测试用例',
  [TestType.TestPlan]: '测试计划',
  [TestType.TestExecution]: '测试执行任务',
  [TestType.TestRun]: '测试执行',
  [TestType.TestDefect]: '缺陷',
};

/** 本地存储前缀 */
export const STORAGE_PREFIX_KEY = 'plugin-test-manager';

/** proxima 系统字段 */
export const SYSTEM_FIELD = {
  SecurityLevel: 'securityLevel',
  ItemType: 'itemType',
  Name: 'name',
  Workflow: 'workflow',
  Workspace: 'workspace',
  Status: 'status',
  Board: 'board',
  ItemGroup: 'itemGroup',
  Key: 'key', //事项ID
  CreatedAt: 'createdAt', // 创建时间
  UpdatedAt: 'updatedAt', // 修改时间
  CreatedBy: 'createdBy', // 创建人
  UpdatedBy: 'updatedBy', // 修改人
  Sprint: 'sprint', // 迭代
  Version: 'version', // 版本
  Assignee: 'assignee', // 负责人
  Priority: 'priority', // 优先级
};

// FieldType字段映射, 对应FieldType表的key字段
export const FIELD_TYPE_KEY_MAPPINGS = {
  // FieldType的custom field
  Text: 'Text', // 文本
  User: 'User', // 用户 -> list load user
  LongText: 'LongText', // 长文本 -> text
  Number: 'Number', // 数值 -> number
  Dropdown: 'Dropdown', // 下拉组件 -> list
  Date: 'Date', // 日期 -> date
  DateRange: 'DateRange', // 日期范围 -> date
  Time: 'Time', // 时间 -> time
  TimeRange: 'TimeRange', // 时间范围 -> time
  BindWorkspace: 'BindWorkspace', // 绑定空间 -> string workspaceId
  Script: 'Script', // 脚本 -> string

  // FieldType的system field
  SecurityLevel: 'SecurityLevel', // 安全级别 -> list
  Key: 'Key', // 事项ID
  Workflow: 'Workflow', // 流程状态 -> list
  Workspace: 'Workspace', //空间 -> list
  Name: 'Name', // 事项标题 -> list
  ItemType: 'ItemType', // 事项类型 -> list
  Screen: 'Screen', // 界面类型 -> screen
  Status: 'Status', // 事项状态 -> status
  FieldCollection: 'FieldCollection', // 字段集合
  ItemLevel: 'ItemLevel', // 事项层级
  Link: 'Link', // 事项管理
  Version: 'Version', // 版本 -> version
  Sprint: 'Sprint', // 迭代 -> sprint
  Assignee: 'Assignee', // 负责人
  Priority: 'Priority', // 优先级
  Board: 'Board', // 面板字段
  ItemGroup: 'ItemGroup', // 事项组类型字段

  // 未存储在FieldType表中，在筛选搜索中用
  CreatedAt: 'createdAt', // 创建时间
  UpdatedAt: 'updatedAt', // 修改时间
  CreatedBy: 'createdBy', // 创建人
  UpdatedBy: 'updatedBy', // 修改人
  Tree: 'Tree', // 树
  Checkbox: 'Checkbox', //复选框
  Radio: 'Radio', //单选框
  Editor: 'Editor', // 富文本类型字段
  Formula: 'Formula', // 公式类型字段
  Annex: 'Annex', //附件类型字段
  File: 'File', // 文件类型字段
  Tag: 'Tag', //Tag类型组件
  DataQuote: 'DataQuote', // 数据引用
  Actors: 'Actors', // 当前负责人(执行人)
};

export const enum ExtensionValType {
  CREATE_OR_UPDATE_ITEM = 'CreateOrUpdateItemVal', // 新建or编辑弹窗
}

export const CREATE_ITEM_STORE_FIELD_KEY = '$testManagerPluginDetailFormValues';
