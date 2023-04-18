import { TestType } from 'common/constant';

export * from 'common/constant';

// 测试管理事件默认 key
export const TEST_MANAGER_PLUGIN_KEY = 'test_manager';

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
  // 事项批量创建，继续创建下一个事项
  itemBatchCreateSuccess = 'itemBatchCreateSuccess',
}

export enum ModalType {
  ModalInherit, //继承
  ModalPlanning, //规划
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
  [TestType.Case]: 'testCase',
  [TestType.Plan]: 'testPlan',
  [TestType.Execution]: 'testExecution',
  [TestType.Run]: 'testRun',
  [TestType.TestDefect]: 'testDefect',
};

// 内置三种类型标识
export const BuiltinItemTypeMapping = {
  [TestType.Case]: 'test_manager_detail',
  [TestType.Plan]: 'test_manager_plan',
  [TestType.Execution]: 'test_manager_execution',
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
  Team: 'team', // 团队
};

export const TABLE_EXCLUDE_FIELDS = [SYSTEM_FIELD.Team];

export const ICLUDE_SYSTEM_FIELD = [SYSTEM_FIELD.Status];

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
  CustomVersion: 'CustomVersion', // 版本（自定义） -> version
  RemoteFieldRemoteDataQuote: 'r_remote_field_remote_data_quote_field_type', // 定制数据引用

  // FieldType的system field
  SecurityLevel: 'SecurityLevel', // 安全级别 -> list
  Key: 'Key', // 事项ID
  Workflow: 'Workflow', // 流程状态 -> list
  Workspace: 'Workspace', //空间 -> list
  Name: 'Name', // 事项标题 -> list
  ItemType: 'ItemType', // 类型 -> list
  Screen: 'Screen', // 界面类型 -> screen
  Status: 'Status', // 事项状态 -> status
  FieldCollection: 'FieldCollection', // 字段集合
  ItemLevel: 'ItemLevel', // 事项层级
  Link: 'Link', // 事项关联
  Version: 'Version', // 版本（系统） -> version
  Sprint: 'Sprint', // 迭代 -> sprint
  Assignee: 'Assignee', // 负责人
  Priority: 'Priority', // 优先级
  Board: 'Board', // 面板字段
  ItemGroup: 'ItemGroup', // 事项组类型字段
  StoryPoint: 'StoryPoint', // 故事点
  StatusType: 'StatusType', // 状态类型
  Reporter: 'Reporter', // 报告人
  Team: 'Team', // 团队 -> team

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
  UserGroup: 'UserGroup', // 用户组
};

export const IS_EXTEND_FIELDS = [FIELD_TYPE_KEY_MAPPINGS.FieldCollection];

export const enum ExtensionValType {
  CREATE_OR_UPDATE_ITEM = 'CreateOrUpdateItemVal', // 新建or编辑弹窗
}

export const CREATE_ITEM_STORE_FIELD_KEY = '$testManagerPluginDetailFormValues';

// 筛选 - 不同字段包含的条件
export const FILTER_EXPR_NAME = {
  Text_Contain: 'Text_Contain',
  Text_Not_Contain: 'Text_Not_Contain',
  Text_Equal: 'Text_Equal',
  Text_Not_Equal: 'Text_Not_Equal',
  Text_Empty: 'Text_Empty',
  Text_Not_Empty: 'Text_Not_Empty',
  Number_Equal: 'Number_Equal',
  Number_Not_Equal: 'Number_Not_Equal',
  Number_Less_Than: 'Number_Less_Than',
  Number_Greater_Than: 'Number_Greater_Than',
  Dropdown_Equal: 'Dropdown_Equal',
  Dropdown_Contain: 'Dropdown_Contain',
  Dropdown_Not_Contain: 'Dropdown_Not_Contain',
  User_Contain: 'User_Contain',
  User_Not_Contain: 'User_Not_Contain',
  Workspace_Equal: 'Workspace_Equal',
  Workspace_Not_Equal: 'Workspace_Not_Equal',
  Workspace_Contain: 'Workspace_Contain',
  Workspace_Not_Contain: 'Workspace_Not_Contain',
  ItemType_Equal: 'ItemType_Equal',
  ItemType_Not_Equal: 'ItemType_Not_Equal',
  ItemType_Contain: 'ItemType_Contain',
  ItemType_Not_Contain: 'ItemType_Not_Contain',
  Key_Equal: 'Key_Equal',
  Key_Not_Equal: 'Key_Not_Equal',
  Key_Less_Than: 'Key_Less_Than',
  Key_Greater_Than: 'Key_Greater_Than',
  Status_Contain: 'Status_Contain',
  Status_Not_Contain: 'Status_Not_Contain',
  CreatedBy_Equal: 'CreatedBy_Equal',
  CreatedBy_Not_Equal: 'CreatedBy_Not_Equal',
  CreatedBy_Contain: 'CreatedBy_Contain',
  CreatedBy_Not_Contain: 'CreatedBy_Not_Contain',
  UpdatedBy_Equal: 'UpdatedBy_Equal',
  UpdatedBy_Not_Equal: 'UpdatedBy_Not_Equal',
  UpdatedBy_Contain: 'UpdatedBy_Contain',
  UpdatedBy_Not_Contain: 'UpdatedBy_Not_Contain',
  Date_Range: 'Date_Range',
  CreatedAt_Range: 'CreatedAt_Range',
  UpdatedAt_Range: 'UpdatedAt_Range',
  BindWorkspace_Equal: 'BindWorkspace_Equal',
  BindWorkspace_Not_Equal: 'BindWorkspace_Not_Equal',
  BindWorkspace_Contain: 'BindWorkspace_Contain',
  BindWorkspace_Not_Contain: 'BindWorkspace_Not_Contain',
  Assignee_Contain: 'Assignee_Contain',
  Assignee_Not_Contain: 'Assignee_Not_Contain',
  Priority_Equal: 'Priority_Equal',
  Priority_Not_Equal: 'Priority_Not_Equal',
  Priority_Less_Than: 'Priority_Less_Than',
  Priority_Greater_Than: 'Priority_Greater_Than',
  Priority_Contain: 'Priority_Contain',
  Priority_Not_Contain: 'Priority_Not_Contain',
  ItemGroup_Contain: 'ItemGroup_Contain',
  ItemGroup_Not_Contain: 'ItemGroup_Not_Contain',
  StatusType_Contain: 'StatusType_Contain',
  StatusType_Not_Contain: 'StatusType_Not_Contain',
  Tag_Contain: 'Tag_Contain',
  Tag_Not_Contain: 'Tag_Not_Contain',
  Test_Repository_Not_Contain: 'test_manager_Repository_Not_Contain',
  Test_Repository_Contain: 'test_manager_Repository_Contain',
  Test_Status_Not_Contain: 'test_manager_status_Not_Contain',
  Test_Status_Contain: 'test_manager_status_Contain',
  UserGroup_Contain: 'UserGroup_Contain',
  UserGroup_Not_Contain: 'UserGroup_Not_Contain',
  Reporter_Contain: 'Reporter_Contain',
  Reporter_Not_Contain: 'Reporter_Not_Contain',
  FieldCollection_Contain: 'FieldCollection_Contain',
  FieldCollection_Not_Contain: 'FieldCollection_Not_Contain',
};

export const FILTER_EXPRESSIONS = t => ({
  Text: [
    // { label: t('common.equal'), value: FILTER_EXPR_NAME.Text_Equal },
    { label: t('common.include'), value: FILTER_EXPR_NAME.Text_Contain },
    { label: t('common.exclude'), value: FILTER_EXPR_NAME.Text_Not_Contain },
    { label: t('common.empty'), value: FILTER_EXPR_NAME.Text_Empty },
    { label: t('common.notEmpty'), value: FILTER_EXPR_NAME.Text_Not_Empty },
    // { label: t('common.notEqual'), value: FILTER_EXPR_NAME.Text_Not_Equal },
  ],
  Number: [
    { label: t('common.equal'), value: FILTER_EXPR_NAME.Number_Equal },
    { label: t('common.notEqual'), value: FILTER_EXPR_NAME.Number_Not_Equal },
    { label: t('common.lessThan'), value: FILTER_EXPR_NAME.Number_Less_Than },
    { label: t('common.greaterThan'), value: FILTER_EXPR_NAME.Number_Greater_Than },
  ],
  Dropdown: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Dropdown_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Dropdown_Not_Contain },
  ],
  DataQuote: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Dropdown_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Dropdown_Not_Contain },
  ],
  Version: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Dropdown_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Dropdown_Not_Contain },
  ],
  CustomVersion: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Dropdown_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Dropdown_Not_Contain },
  ],
  Sprint: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Dropdown_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Dropdown_Not_Contain },
  ],
  User: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.User_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.User_Not_Contain },
  ],
  Workspace: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Workspace_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Workspace_Not_Contain },
  ],
  BindWorkspace: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.BindWorkspace_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.BindWorkspace_Not_Contain },
  ],
  ItemType: [
    //类型
    { label: t('common.contain'), value: FILTER_EXPR_NAME.ItemType_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.ItemType_Not_Contain },
  ],
  Key: [
    //事项ID
    { label: t('common.equal'), value: FILTER_EXPR_NAME.Key_Equal },
    { label: t('common.notEqual'), value: FILTER_EXPR_NAME.Key_Not_Equal },
    { label: t('common.lessThan'), value: FILTER_EXPR_NAME.Key_Less_Than },
    { label: t('common.greaterThan'), value: FILTER_EXPR_NAME.Key_Greater_Than },
  ],
  Status: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Status_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Status_Not_Contain },
  ],
  createdBy: [
    // parse默认字段，首字母小写
    { label: t('common.contain'), value: FILTER_EXPR_NAME.CreatedBy_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.CreatedBy_Not_Contain },
  ],
  updatedBy: [
    // parse默认字段，首字母小写
    { label: t('common.contain'), value: FILTER_EXPR_NAME.UpdatedBy_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.UpdatedBy_Not_Contain },
  ],
  Assignee: [
    // 负责人
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Assignee_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Assignee_Not_Contain },
  ],
  Priority: [
    // 优先级
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Priority_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Priority_Not_Contain },
    { label: t('common.lessThan'), value: FILTER_EXPR_NAME.Priority_Less_Than },
    { label: t('common.greaterThan'), value: FILTER_EXPR_NAME.Priority_Greater_Than },
  ],
  ItemGroup: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.ItemGroup_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.ItemGroup_Not_Contain },
  ],
  StatusType: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.StatusType_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.StatusType_Not_Contain },
  ],
  Tag: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Tag_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Tag_Not_Contain },
  ],
  UserGroup: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.UserGroup_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.UserGroup_Not_Contain },
  ],
  Reporter: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Reporter_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Reporter_Not_Contain },
  ],
  FieldCollection: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.FieldCollection_Contain },
    {
      label: t('common.notContain'),
      value: FILTER_EXPR_NAME.FieldCollection_Not_Contain,
    },
  ],
  Team: [
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Dropdown_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Dropdown_Not_Contain },
  ],
  test_manager_Repository: [
    // 测试用例库模块
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Test_Repository_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Test_Repository_Not_Contain },
  ],
  test_manager_status: [
    // 测试用例最新执行状态
    { label: t('common.contain'), value: FILTER_EXPR_NAME.Test_Status_Contain },
    { label: t('common.notContain'), value: FILTER_EXPR_NAME.Test_Status_Not_Contain },
  ],
});

export const IQL_CONDITION = {
  NOT_EQUAL: '!=',
  EQUAL: '=',
  GREATER_THAN: '>',
  LESS_THAN: '<',
  GREATER_THAN_EQUAL: '>=',
  LESS_THAN_EQUAL: '<=',
  NOT_CONTAIN: 'not in',
  CONTAIN: 'in',
  TEXT_CONTAIN: '~',
  TEXT_NOT_CONTAIN: '!~',
  ORDER_BY: 'order by',
  // is后面只能跟null或者empty
  IS: 'is',
  IS_NOT: 'is not',
  DESC: 'desc',
  ASC: 'asc',
  AND: 'and',
  _AND_: ' and ',
  _OR_: ' or ',
};

export const isUseOptionLabel = (component: string): boolean => {
  return [
    FIELD_TYPE_KEY_MAPPINGS.Workspace,
    FIELD_TYPE_KEY_MAPPINGS.ItemType,
    FIELD_TYPE_KEY_MAPPINGS.ItemGroup,
    FIELD_TYPE_KEY_MAPPINGS.Priority,
    FIELD_TYPE_KEY_MAPPINGS.BindWorkspace,
    FIELD_TYPE_KEY_MAPPINGS.StatusType,
    FIELD_TYPE_KEY_MAPPINGS.Version,
    FIELD_TYPE_KEY_MAPPINGS.CustomVersion,
    FIELD_TYPE_KEY_MAPPINGS.Sprint,
    FIELD_TYPE_KEY_MAPPINGS.Tag,
  ].includes(component);
};

export const EXINCLUDE_FIELDS = [FIELD_TYPE_KEY_MAPPINGS.DataQuote];

export const isUseOptionValue = (component: string): boolean => {
  return [FIELD_TYPE_KEY_MAPPINGS.Dropdown].includes(component);
};

export const SystemIncludeFieldKeys = [
  'createdBy',
  'priority',
  'assignee',
  'createdAt',
  'version',
  'sprint',
];

// 全局配置缓存 key
export const GlobalConfigStorageKey = 'test_manager_global_config';
// 当前空间缓存 key
export const CurrentWorkspaceConfigStorageKey = 'test_manager_current_workspace_config';

export const appKey = window.QiankunProps?.frame?.app?.key || 'test_manager';

// 筛选器 无 选项
export const SelectorNullValue = 'NULL';
// 筛选器 CurrentUser 选项
export const SelectorCurrentUserValue = 'currentUser';

export const RepositoryModel = `${appKey}_Repository`;
export const TestCaseStatusModel = `${appKey}_status`;
export const TestRunDesigneeModel = `${appKey}_designee`;
export const TestRunExecutorModel = `${appKey}_executor`;

export const getExtendFields = t => [
  {
    key: RepositoryModel,
    name: t('common.testRepository'),
    objectId: RepositoryModel,
    fieldType: {
      isExtend: true,
      dataType: 'object',
      objectId: RepositoryModel,
      key: RepositoryModel,
      name: t('common.testRepository'),
    },
  },
  {
    key: TestRunDesigneeModel,
    // name: '执行人',
    name: t('common.designee'),
    objectId: TestRunDesigneeModel,
    fieldType: {
      component: 'createdBy',
      dataType: 'object',
      objectId: 'test_designee',
      key: 'createdBy',
      name: t('common.user'),
    },
  },
  {
    key: TestRunExecutorModel,
    // name: '最新操作执行人',
    name: t('common.testExecutor'),
    objectId: TestRunExecutorModel,
    fieldType: {
      component: 'createdBy',
      dataType: 'object',
      objectId: 'test_executor',
      key: 'createdBy',
      name: t('common.user'),
    },
  },
  {
    key: TestCaseStatusModel,
    // name: '测试执行状态',
    name: t('common.testCaseStatus'),
    objectId: TestCaseStatusModel,
    fieldType: {
      isExtend: true,
      dataType: 'object',
      objectId: TestCaseStatusModel,
      key: TestCaseStatusModel,
      name: t('common.testCaseStatus'),
    },
  },
];

export const UserTypeSelectorFieldKeys = ['test_designee', 'test_executor'];
