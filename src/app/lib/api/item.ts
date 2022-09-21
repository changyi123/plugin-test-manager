import fetch from '@/lib/utils/fetch';
import {
  FieldKey,
  PaginationParams,
  Query,
  QueryLinkedTestEntityPayload,
  TestExecutionStatsPayload,
  TestPlanStatsPayload,
  TestCaseStatsPayload,
} from 'common/types/api';
import { lib } from 'proxima-sdk';
const { selectorToIql } = lib.Iql;

type TestEntityPayload = PaginationParams & {
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
  /** 只返回 id */
  onlySelectId?: boolean;
};

// 查询测试用例事项
export const getTestEntityByQuery = async (props: TestEntityPayload) => {
  const _props = Object.assign(
    { descending: [], onlySelectId: false },
    { ...props, selectors: selectorToIql(props.selectors) },
  );

  const {
    data: { data },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-query-test-entity', _props);

  return {
    list: data.list ?? [],
    total: data.total ?? [],
  };
};

// 关联查询
export const getlinkedTestEntityByQuery = async (props: QueryLinkedTestEntityPayload) => {
  const {
    data: { data },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-query-linked-test-entity', props);

  return {
    list: data.list ?? [],
    total: data.total ?? 0,
  };
};

// 测试计划统计查询
export const getStatsTestPlan = async (props: TestPlanStatsPayload) => {
  const {
    data: { data },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-stats-test-plan', props);

  return data;
};

// 测试执行任务统计查询
export const getStatsTestExecution = async (props: TestExecutionStatsPayload) => {
  const {
    data: { data },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-stats-test-execution', props);

  return data;
};

// 批量删除测试实体事项
export const deleteTestEntity = async ids => {
  const res = await fetch.post('/api/app/osc/test_manager/webhooks/api-batch-delete', {
    ids,
  });

  return res;
};

// 批量更新测试实体事项
export const updateTestEntity = async data => {
  const res = await fetch.post('/api/app/osc/test_manager/webhooks/api-batch-update', {
    data,
  });

  return res;
};

// 测试计划数据统计接口
export const getStatsFormPlan = async (data: TestPlanStatsPayload) => {
  const {
    data: { data: res },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-stats-test-plan', data);

  return res;
};

// 通过测试用例去查任务数
export const getRunsFromCase = async (data: TestCaseStatsPayload) => {
  const {
    data: { data: res },
  } = await fetch.post('/api/app/osc/test_manager/webhooks/api-stats-test-case', data);
  return res;
};
