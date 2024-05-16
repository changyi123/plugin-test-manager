/**
 * @file 后端 webTrigger 接口数据请求
 */

import { IQLFieldNameMapping, TestLinkType, TestType } from '../constant';
import { Status, TestEntity } from '../types/test';
import { TestEntityLinkActionData } from './common';

/** 已知字段 */
export type FieldKey = keyof typeof IQLFieldNameMapping;

export type StatusCode = 'ok' | 'error';

/** 关联类型查询参数 */
export type LinkQueryPayload = {
  /** 关联类型 */
  linkType: TestLinkType;
  /** 关联 items id */
  sourceIds: string | string[];
  /** destination 查询实体类型 */
  destinationType: TestType;
};

export type ResponseType<T> = {
  status: StatusCode;
  data: T;
};

export type PaginationParams = {
  offset?: number;
  limit?: number;
};

export type PaginationResponse<T> = ResponseType<
  PaginationParams & {
    total: number;
    list: T[];
  }
>;

/** 测试实体查询支持快捷查询 */
export type Query = Partial<{
  /** 事项名称
   *  iql: name ~ ''
   */
  name: string;
  /** 空间标识
   *  iql: workspaceKey in []
   */
  workspaceKey: string | string[];
  /** 空间名
   *  iql: 所属空间 in []
   */
  workspace: string | string[];
  /** 事项 id
   *  iql: id in []
   */
  id: string | string[];
  /** 事项 key
   *  iql: key in []
   */
  key: string | string[];
  /** 测试类型查询
   *  iql: 测试类型 in []
   */
  type: string | string[];
  /** 测试用例库模块查询
   *  iql: 测试用例库模块 in []
   */
  repository: string | string[];
  /** 关联的测试用例查询
   *  iql: 测试用例引用 in []
   */
  referenceCase: string | string[];
  /** 关联事项类型
   *  iql: 类型 is 'NULL'
   */
  linkType: string;
}>;

/** 测试实体查询的通用  */
export type CommonTestEntityQueryPayload = PaginationParams & {
  /** 测试实体查询支持快捷查询 */
  query?: Query;
  /** 筛选器选择 */
  selector?: string;
  /** 接口需要获取的自定义字段，会自动拼接测试实体的字段 */
  fields?: string[];
  /** 限制返回接口字段，优先级比 fields 的高，如果有 select 参数 fields 就不会生效 */
  select?: FieldKey[];
  /** 升序字段 */
  ascending?: FieldKey[];
  /** 降序字段 */
  descending?: FieldKey[];
  /** 只返回 id */
  onlySelectId?: boolean;
  /** 按照 repository 参数对响应结果排序 */
  sortByRepositoryIds?: string[];
};

/**
 * 查询测试计划下最新状态的用例
 * @example POST /api/project/app/osc/test_manager/webhooks/api-query-case-by-status
 */
export type QueryCaseIdByStatusPayload = {
  planId: string;
  status: Status['key'][] | null;
  isExclude?: boolean;
};
export type QueryCaseIdByStatusResponse = string[];

/**
 * 查询测试实体
 * @example POST /api/project/app/osc/test_manager/webhooks/api-query-test-entity
 */
export type QueryTestEntityPayload = CommonTestEntityQueryPayload;
export type QueryTestEntityResponse<T extends TestType> = PaginationResponse<TestEntity<T>>;

/**
 * 查询关联测试实体
 * @example POST /api/project/app/osc/test_manager/webhooks/api-query-linked-test-entity
 */
export type QueryLinkedTestEntityPayload = CommonTestEntityQueryPayload & LinkQueryPayload;
/** 查询关联测试实体 */
export type QueryLinkedTestEntityResponse<T extends TestType> = PaginationResponse<
  TestEntity<T> & {
    /** 关联方 source id 数据
     *  兼容测试计划关联测试用例为多对多关联，响应值为数组
     * linkType = caseLinkPlan, destType = testCase 该情况为多个 id，其他的情况只有一个 id
     */
    source: string[];
  }
>;

/**
 * 删除测试实体
 * @example POST /api/project/app/osc/test_manager/webhooks/api-batch-delete
 */
export type BatchDeletePayload = {
  ids: string[];
  /** 跳过更新关联数据 */
  skipDeletedLinkItems: boolean;
};

/**
 * 更新测试实体数据
 * @example POST /api/project/app/osc/test_manager/webhooks/api-batch-update
 */
export type BatchUpdatePayload = {
  data: (Partial<TestEntity> | TestEntityLinkActionData)[];
};

/**
 * 创建测试用例
 * @example POST /api/project/app/osc/test_manager/webhooks/api-batch-create-test-case
 */
export type BatchCreateTestCasePayload = {
  workspaceId: string;
  data: TestEntity<TestType.Case>[];
};

/**
 * 复制测试用例
 * @example POST /api/project/app/osc/test_manager/webhooks/api-batch-copy-test-case
 */
export type BatchCopyTestCasePayload = {
  caseIds: string[];
  fields: string[];
  workspaceKey?: string;
  repository?: string;
};

/**
 * 创建测试实体
 * @example POST /api/project/app/osc/test_manager/webhooks/api-batch-create-test-run
 */
export type BatchCreateTestRunPayload = {
  /** 测试执行任务 id */
  executionId?: string;
  /** 测试执行任务 id */
  caseIds: string[];
};

/** 状态类型 */
type StatusStatsType = Record<Status['key'], number>;

/**
 * 测试计划数据统计接口
 * @example POST /api/project/app/osc/test_manager/webhooks/api-stats-test-plan
 */
export type TestPlanStatsPayload = {
  /** 测试计划 id */
  planIds: string[];
  /** 数据数据字段 */
  select?: ('caseCount' | 'caseStatus' | 'executionCount')[];
};

export type TestPlanStatsResponse = ResponseType<{
  caseCount: number;
  executionCount: number;
  caseStatus: StatusStatsType;
}>;

/**
 * 测试计划数据统计接口
 * @example POST /api/project/app/osc/test_manager/webhooks/api-stats-test-execution
 */
export type TestExecutionStatsPayload = {
  /** 测试计划 id */
  executionIds: string[];
  /** 数据数据字段 */
  select?: ('runStatus' | 'runCount')[];
};

/**
 * 测试用例统计（测试计划页面用例列表统计数据）
 * @example POST /api/project/app/osc/test_manager/webhooks/api-stats-test-case
 */
export type TestCaseStatsPayload = {
  /** 测试计划 id */
  caseIds: string[];
  /** 测试计划 id */
  planId: string;
  /** 数据数据字段 */
  select?: ('runCount' | 'caseLatestStatus')[];
};

/**
 * 获取测试用例树
 * @example POST /api/project/app/osc/test_manager/webhooks/api-module-repository-tree
 */
export type RepositoryTreePayload = {
  workspaceKey: string;
  params?: QueryLinkedTestEntityPayload;
};

/**
 * 获取测试管理脑图数据
 * @example POST /api/project/app/osc/test_manager/webhooks/api-query-minder-data
 */
export type MinderDataPayload = {
  workspaceKey: string;
  repositoryKey: string;
};

/**
 * 脑图数据导入
 * @example POST /api/project/app/osc/test_manager/webhooks/api-query-minder-data
 */
export type MinderDataImportPayload = {
  workspaceKey: string;
  minderData: any;
};

/**
 * 测试管理统计自定义字段状态
 * @example POST /api/project/app/osc/test_manager/webhooks/api-count-test
 */
export type TestCountPayload = {
  groups?: string | string[];
  params?: QueryLinkedTestEntityPayload;
  linkParams?: {
    planId?: string;
    workspaceKey?: string;
    caseIds?: string[];
  };
  sessionToken?: string;
};

/** 查询测试报告 */
export type QueryTestReportPayload = {
  // 版本名称
  versionName: string;
};

/** 查询测试报告 */
export type GenerateTestReportPayload = {
  // 测试报告 ID
  testReportId: string;
  exportPdf?: boolean;
};

/** internal 站内信 */
type PostType = 'internal' | 'email';

/** 消息通知 */
export type SendMessagePayload = {
  useTemplate: string;
  postType: PostType[];
  creatUser?: string;
  roles?: string[];
  users?: string[];
  templatePayload: Record<string, any>;
};

/** 批量添加执行到测试用例 */
export type AddTestExecuteToTestPlanPayload = {
  /** 测试用例 id */
  testPlanId: string;
  /** 测试执行任务 Id */
  testExecutionIds: string[];
};
