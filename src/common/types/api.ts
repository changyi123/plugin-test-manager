/**
 * @file 后端 webTrigger 接口数据请求
 */

import { TestEntity } from '../types/test';
import { TestLinkType, TestType, IQLFieldNameMapping } from '../constant';

/** 已知字段 */
type FieldKey = keyof typeof IQLFieldNameMapping;

export type StatusCode = 'ok' | 'error';

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
type Query = Partial<{
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
}>;

/** 测试实体查询的通用  */
type CommonTestEntityQueryPayload = PaginationParams & {
  /** 测试实体查询支持快捷查询 */
  query?: Query;
  /** 筛选器选择 */
  selectors?: any;
  /** 限制接口返回的字段 */
  fields?: FieldKey[];
  /** 升序字段 */
  ascending?: FieldKey[];
  /** 降序字段 */
  descending?: FieldKey[];
};

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
export type QueryLinkedTestEntityPayload = CommonTestEntityQueryPayload & {
  /** 关联类型 */
  linkType: TestLinkType;
  /** 关联 items id */
  sourceIds: string[] | string[];
  /** destination 查询实体类型 */
  destinationType: TestType;
};
/** 查询关联测试实体 */
export type QueryLinkedTestEntityResponse<T extends TestType> = PaginationResponse<
  TestEntity<T> & {
    // 关联方 source 数据
    source: string;
    // 被关联方 source 数据
    destination: string;
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
  data: (Partial<TestEntity> & { objectId: string })[];
};

/**
 * 创建测试实体
 * @example POST /api/project/app/osc/test_manager/webhooks/api-batch-create
 */
export type BatchCreatePayload = {
  data: (Partial<TestEntity> & { name: string; workspace: string; itemType: string })[];
};
