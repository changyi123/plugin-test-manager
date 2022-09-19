import fetch from '@/lib/utils/fetch';
import {
  QueryLinkedTestEntityPayload,
  QueryTestEntityPayload,
  TestExecutionStats,
  TestPlanStatsPayload,
} from 'common/types/api';

// 查询测试用例事项
export const getTestEntityByQuery = async (props: QueryTestEntityPayload) => {
  const _props = Object.assign({ descending: ['createdAt'] }, props);

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
export const getStatsTestExecution = async (props: TestExecutionStats) => {
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
