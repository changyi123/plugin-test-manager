export const AppKey = 'test_manager' as const;

/** 测试实体类型 */
export enum TestType {
  /** 测试执行 */
  Run = 'TestRun',
  /** 测试用例 */
  Case = 'TestCase',
  /** 测试计划 */
  Plan = 'TestPlan',
  /** 测试执行任务 */
  Execution = 'TestExecution',
  TestDefect = 'TestDefect', // 避免大量ts报错
}

/** 测试关联类型 */
export enum TestLinkType {
  /** 测试用例关联计划（N:1）*/
  CaseLinkPlan = 'CaseLinkPlan',
  /** 测试执行关联测试执行任务（N:1）*/
  RunLinkExecution = 'RunLinkExecution',
  /** 测试执行任务关联测试计划（N:1）*/
  ExecutionLinkPlan = 'ExecutionLinkPlan',
}

/** 测试管理自定义字段 key 映射 */
export const TestFiledKeyMapping = {
  linkType: 'r_test_manager_linkType',
  linkItems: 'r_test_manager_linkItems',
  status: 'r_test_manager_status',
  referenceCase: 'r_test_manager_referenceCase',
  type: 'r_test_manager_type',
  caseStatus: 'r_test_manager_caseStatus',
  repository: 'r_test_manager_repository',
  designee: 'r_test_manager_designee',
  executor: 'r_test_manager_executor',
  sortIndex: 'r_test_manager_sortIndex',

  // 以下字段以字符串形式存入，存入前需要 stringify，返回需要 parse
  detail: 'r_test_manager_detail',
  runDetail: 'r_test_manager_runDetail',
  comment: 'r_test_manager_comment',
} as const;

export const TestFiledKeyKeys = Object.keys(
  TestFiledKeyMapping,
) as (keyof typeof TestFiledKeyMapping)[];

/** 测试管理内置自定义字段 name 映射，用户拼接 IQL 查询条件 */
export const BuiltinFieldNameMapping = {
  linkType: 'test_manager_linkType',
  linkItems: 'test_manager_linkItems',
  status: 'test_manager_status',
  referenceCase: 'test_manager_referenceCase',
  type: 'test_manager_type',
  caseStatus: 'test_manager_caseStatus',
  repository: 'test_manager_repository',
  designee: 'test_manager_designee',
  executor: 'test_manager_executor',
  sortIndex: 'test_manager_sortIndex',
} as const;

export const SystemFieldNameMapping = {
  id: 'id',
  name: '标题',
  key: 'key',
  itemType: '类型',
  status: '状态',
  workspace: '所属空间',
  createdAt: '创建时间',
  workspaceKey: 'workspaceKey',
} as const;

export const IQLFieldNameMapping = {
  ...BuiltinFieldNameMapping,
  ...SystemFieldNameMapping,
} as const;

export const IQLSearchFieldKeys = Object.keys(
  IQLFieldNameMapping,
) as (keyof typeof IQLFieldNameMapping)[];

/** proxima 系统字段 */
export const SystemField = {
  SecurityLevel: 'securityLevel',
  ItemType: 'itemType',
  Name: 'name',
  Workflow: 'workflow',
  Workspace: 'workspace',
  Status: 'status',
  Key: 'key', //事项ID
  CreatedAt: 'createdAt', // 创建时间
  UpdatedAt: 'updatedAt', // 修改时间
  CreatedBy: 'createdBy', // 创建人
  UpdatedBy: 'updatedBy', // 修改人
  Sprint: 'sprint', // 迭代
  Version: 'version', // 版本
  Assignee: 'assignee', // 负责人
  Priority: 'priority', // 优先级
  Id: 'id',
  ItemGroup: 'itemGroup', // 事项组
} as const;

/** iql 必须的返回字段 */
export const IQLRequiredFieldKeys = [SystemField.Id];

/** iql 有业务意义的返回字段 */
export const IQLUsefulFieldKeys = [
  SystemField.Id,
  SystemField.Key,
  SystemField.Name,
  SystemField.Status,
  SystemField.ItemType,
  SystemField.CreatedAt,
  SystemField.CreatedBy,
  SystemField.Workspace,
  SystemField.Assignee,
  SystemField.Priority,
  // SystemField.UpdatedAt,
  // SystemField.UpdatedBy,
  // 'values',
  // 测试管理自定义字段
  ...Object.values(TestFiledKeyMapping),
];

/** 无限分页 */
export const InfinityLimit = 100000;

/** 内置类型映射 */
export const BuiltInItemTypeMapping = {
  [TestType.Run]: 'test_manager_run',
  [TestType.Plan]: 'test_manager_plan',
  [TestType.Case]: 'test_manager_detail',
  [TestType.Execution]: 'test_manager_execution',
};

/** 开始节点 key */
export const StartStatusKey = 'TODO';

/** 测试用例库 className */
export const RepositoryClassName = 'test_manager_Repository';

export const TestConfigClassName = 'test_manager_TestConfig';
