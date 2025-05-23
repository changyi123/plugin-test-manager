export const AppKey = 'test_manager' as const;

export const FIELD_TYPE = {
  // 系统字段
  NAME: 'Name',
  BOARD: 'Board',
  ANNEX: 'Annex',
  STATUS: 'Status',
  ITEM_TYPE: 'ItemType',
  WORKSPACE: 'Workspace',
  TAG: 'Tag',
  DATE: 'Date',
  NUMBER: 'Number',
  TIME: 'Time',
  USER: 'User',
  TREE: 'Tree',
  FILE: 'File',
  RADIO: 'Radio',
  EDITOR: 'Editor',
  CHECKBOX: 'Checkbox',
  DROPDOWN: 'Dropdown',
  TEXT: 'Text',
  LINK: 'Link',
  FORMULA: 'Formula',
  LONG_TEXT: 'LongText',
  SECURITY_LEVEL: 'SecurityLevel',
  VERSION: 'Version',
  SPRINT: 'Sprint',
  ITEMGROUP: 'ItemGroup',
  PRIORITY: 'Priority',
  ASSIGNEE: 'Assignee',
  SNAPSHOT: 'Snapshot',
  // 当前处理人
  ACTORS: 'Actors',
  ITEMHANDLER: 'ItemHandler',
  ROLE: 'Role',
  // GROUP: 'Group',
  BINDWORKSPACE: 'BindWorkspace',
  // 字段集合
  FIELDCOLLECTION: 'FieldCollection',
  SCRIPT: 'Script',
  ITEMLEVEL: 'ItemLevel',
  DATAQUOTE: 'DataQuote',
  R_REMOTE_FIELD_REMOTE_DATA_QUOTE_FIELD_TYPE: 'r_remote_field_remote_data_quote_field_type',
  // 自定义字段
  CUSTOM_VERSION: 'CustomVersion',
  // 状态类型
  STATUS_TYPE: 'StatusType',
  //用户组
  USER_GROUP: 'UserGroup',
  REPORTER: 'Reporter',
  WORKSPACE_ROLE: 'WorkspaceRole',
  STORY_POINT: 'StoryPoint',
  TEAM: 'Team',
};

/** 测试实体类型 */
export enum TestType {
  /** 测试执行 */
  Run = 'TestRun',
  /** 测试用例 */
  Case = 'TestCase',
  /** 测试计划 */
  Plan = 'TestPlan',
  /** 测试缺陷 */
  Defect = 'TestDefect',
  /** 测试执行任务 */
  Execution = 'TestExecution',
  TestDefect = 'TestDefect', // 避免大量ts报错
  /** 测试报告 */
  Report = 'TestReport',
}

// 拓展的测试报告条件
export enum ExtendReportType {
  Parent = 'parent',
  Relative = 'relative',
  PlanParent = 'planParent',
  PlanParentLink = 'planParentLink',
  Self = 'self',
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

/** es source key */
export const EsSourceFieldKey = {
  repository: 'r_test_manager_repository#r_test_manager_repository_keyword',
};

/** 测试管理统计字段类型 key 映射 */
export const TestFieldTypeKeyMapping = {
  executeCount: 'r_test_manager_es_number_keyword',
  executeTime: 'r_test_manager_executeTime',
  repository: 'r_test_manager_repository_keyword',
  referenceCase: 'r_test_manager_es_text_keyword',
  referenceCaseSnapshot: 'r_test_manager_es_text_keyword',
  status: 'r_test_manager_es_text_keyword',
  linkItems: 'r_test_manager_es_array_keyword',
  plan: 'Text.keyword',
};

/** 测试管理自定义字段 key 映射 */
export const TestFiledKeyMapping = {
  linkType: 'r_test_manager_linkType',
  linkItems: 'r_test_manager_linkItems',
  status: 'r_test_manager_status',
  referenceCase: 'r_test_manager_referenceCase',
  referenceCaseSnapshot: 'r_test_manager_referenceCaseSnapshot',
  type: 'r_test_manager_type',
  caseStatus: 'r_test_manager_caseStatus',
  caseExecutor: 'r_test_manager_caseExecutor',
  repository: 'r_test_manager_repository',
  designee: 'r_test_manager_designee',
  executor: 'r_test_manager_executor',
  sortIndex: 'r_test_manager_sortIndex',
  executeCount: 'r_test_manager_executeCount',
  executeTime: 'r_test_manager_executeTime',
  caseRun: 'r_test_manager_caseRun',
  reportOverviewData: 'r_test_manager_reportOverviewData',
  reportChartGroup: 'r_test_manager_reportChartGroup',
  reportTemplate: 'r_test_manager_reportTemplate',
  plan: 'r_test_manager_plan',

  // 以下字段以字符串形式存入，存入前需要 stringify，返回需要 parse
  detail: 'r_test_manager_detail',
  runDetail: 'r_test_manager_runDetail',
  comment: 'r_test_manager_comment',
} as const;

export const NotValidatorFiledKeyMapping = {
  linkType: 'r_test_manager_linkType',
  linkItems: 'r_test_manager_linkItems',
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
  referenceCaseSnapshot: 'test_manager_referenceCaseSnapshot',
  type: 'test_manager_type',
  caseStatus: 'test_manager_caseStatus',
  caseExecutor: 'test_manager_caseExecutor',
  repository: 'test_manager_repository',
  designee: 'test_manager_designee',
  executor: 'test_manager_executor',
  sortIndex: 'test_manager_sortIndex',
  executeCount: 'test_manager_executeCount',
  executeTime: 'r_test_manager_executeTime',
  caseRun: 'test_manager_caseRun',
  plan: 'test_manager_plan',

  // 不需要拼接
  runDetail: 'test_manager_runDetail',
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
  SystemField.UpdatedAt,
  SystemField.UpdatedBy,
  // 'values',
  // 测试管理自定义字段
  ...Object.values(TestFiledKeyMapping),
];

/** 无限分页 */
export const InfinityLimit = 99999;

/** 内置类型映射 */
export const BuiltInItemTypeMapping = {
  [TestType.Run]: 'test_manager_run',
  [TestType.Plan]: 'test_manager_plan',
  [TestType.Case]: 'test_manager_detail',
  [TestType.Execution]: 'test_manager_execution',
  [TestType.Defect]: 'test_manager_defect',
};

/** 开始节点 key */
export const StartStatusKey = 'TODO';

/** 测试用例库 className */
export const RepositoryClassName = 'test_manager_Repository';

export const TestConfigClassName = 'test_manager_TestConfig';

/** 脑图节点类型 */
export enum MinderNodeType {
  Root = 'Root',
  Module = 'Module',
  TestCase = 'TestCase',
  Precondition = 'Precondition',
  Step = 'Step',
  Result = 'Result',
  Data = 'Data',
}

export const UngroupedRepositoryKey = 'root';

export const EXPORT_FIELD_PREFIX = 'apps:';
export const EXPORT_FIELD_VALUES = {
  precondition: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.detail}:precondition`,
  step: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.detail}:step`,
  result: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.detail}:result`,
  data: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.detail}:data`,
  group: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.repository}`,
  executor: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.caseExecutor}`,
  status: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.caseStatus}`,
  testPlan: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.linkItems}`,
  testExecution: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.linkItems}:testExecution`,
  testExecutionBindPlan: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.linkItems}:testPlan`,
  testExecutionStatus: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.status}`,
  testExecutionCount: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.executeCount}`,
  actualResult: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.runDetail}:actualResult`,
  stepStatus: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.runDetail}:stepStatus`,
  runExecutor: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.executor}`,
  executionTime: `${EXPORT_FIELD_PREFIX}${TestFiledKeyMapping.executeTime}`,
};

export const EXPORT_ITEM_FIELDS = [
  {
    label: SystemField.Key,
    value: SystemField.Key,
  },
  {
    label: SystemField.Name,
    value: SystemField.Name,
  },
  {
    label: 'itemStatus',
    value: SystemField.Status,
  },
  {
    label: SystemField.Workspace,
    value: SystemField.Workspace,
  },
  {
    label: SystemField.ItemType,
    value: SystemField.ItemType,
  },
  {
    label: SystemField.Assignee,
    value: SystemField.Assignee,
  },
  {
    label: SystemField.Priority,
    value: SystemField.Priority,
  },
];

export const EXPORT_TEST_FIELDS = [
  {
    label: 'precondition',
    value: EXPORT_FIELD_VALUES.precondition,
    fieldKey: TestFiledKeyMapping.detail,
  },
  {
    label: 'step',
    value: EXPORT_FIELD_VALUES.step,
    fieldKey: TestFiledKeyMapping.detail,
  },
  {
    label: 'result',
    value: EXPORT_FIELD_VALUES.result,
    fieldKey: TestFiledKeyMapping.detail,
  },
  {
    label: 'data',
    value: EXPORT_FIELD_VALUES.data,
    fieldKey: TestFiledKeyMapping.detail,
  },
  {
    label: 'group',
    value: EXPORT_FIELD_VALUES.group,
    fieldKey: TestFiledKeyMapping.repository,
  },
];

export const EXPORT_PLAN_FIELDS = [
  {
    label: 'executor',
    value: EXPORT_FIELD_VALUES.executor,
    fieldKey: TestFiledKeyMapping.caseExecutor,
  },
  {
    label: 'testPlan',
    value: EXPORT_FIELD_VALUES.testPlan,
    fieldKey: TestFiledKeyMapping.linkItems,
  },
  {
    label: 'status',
    value: EXPORT_FIELD_VALUES.status,
    fieldKey: TestFiledKeyMapping.caseStatus,
  },
];

export const EXPORT_EXECUTION_FIELDS = [
  {
    label: 'testPlan',
    value: EXPORT_FIELD_VALUES.testExecutionBindPlan,
    fieldKey: TestFiledKeyMapping.linkItems,
  },
  {
    label: 'testExecution',
    value: EXPORT_FIELD_VALUES.testExecution,
    fieldKey: TestFiledKeyMapping.linkItems,
  },
  {
    label: 'testTitle',
    value: 'name',
  },
  {
    label: 'testKey',
    value: 'key',
  },
  {
    label: 'testExecutionStatus',
    value: EXPORT_FIELD_VALUES.testExecutionStatus,
    fieldKey: TestFiledKeyMapping.status,
  },
  {
    label: 'testExecutionCount',
    value: EXPORT_FIELD_VALUES.testExecutionCount,
    fieldKey: TestFiledKeyMapping.executeCount,
  },
  {
    label: 'step',
    value: EXPORT_FIELD_VALUES.step,
    fieldKey: TestFiledKeyMapping.runDetail,
  },
  {
    label: 'result',
    value: EXPORT_FIELD_VALUES.result,
    fieldKey: TestFiledKeyMapping.runDetail,
  },
  {
    label: 'data',
    value: EXPORT_FIELD_VALUES.data,
    fieldKey: TestFiledKeyMapping.runDetail,
  },
  {
    label: 'stepStatus',
    value: EXPORT_FIELD_VALUES.stepStatus,
    fieldKey: TestFiledKeyMapping.runDetail,
  },
  {
    label: 'actualResult',
    value: EXPORT_FIELD_VALUES.actualResult,
    fieldKey: TestFiledKeyMapping.runDetail,
  },
  {
    label: 'testExecutionTime',
    value: EXPORT_FIELD_VALUES.executionTime,
    fieldKey: TestFiledKeyMapping.executeTime,
  },
  {
    label: 'executor',
    value: EXPORT_FIELD_VALUES.runExecutor,
    fieldKey: TestFiledKeyMapping.executor,
  },
  {
    label: 'precondition',
    value: EXPORT_FIELD_VALUES.precondition,
    fieldKey: TestFiledKeyMapping.runDetail,
  },
];
