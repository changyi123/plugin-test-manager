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

/**
 * 查询测试实体
 * @example POST /api/project/app/osc/test_manager/webhooks/api-query-test-entity
 */
export type QueryTestEntityPayload = PaginationParams & { id: string[] };
export type QueryTestEntityResponse = PaginationResponse<TestEntity>;
