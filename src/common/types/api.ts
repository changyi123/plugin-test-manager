/**
 * @file 后端 webTrigger 接口数据请求
 */

import { TestEntity } from 'common/types/test';

export type StatusCode = 'ok' | 'error';

export type ResponseType<T> = {
  status: StatusCode;
  data: T;
};

export type PaginationParams = {
  current?: number;
  pageSize?: number;
};

export type PaginationResponse<T> = ResponseType<
  PaginationParams & {
    total: number;
    list: T[];
  }
>;

export type UpdateParams = {
  data?: ItemParams[];
};

export type ItemParams = {
  object: string;
  values?: Record<string, unknown>;
};

/**
 * 查询测试实体
 * @example POST /api/project/app/osc/test_manager/webhooks/api-query-test-entity
 */
export type QueryTestEntityPayload = PaginationParams &
  UpdateParams & { id: string[]; type?: 'Plan' | 'Case' | 'Run' | 'Execution' };
export type QueryTestEntityResponse = PaginationResponse<TestEntity>;
