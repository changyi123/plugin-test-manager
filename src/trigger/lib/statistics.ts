// 统计相关接口
import { requestCoreApi } from '@giteeteam/apps-team-api';

import {
  BuiltinFieldNameMapping,
  InfinityLimit,
  TestFieldTypeKeyMapping,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../common/constant';
import { iqlRequest } from './iqlRequest';

const condition = {
  linkItems: {
    key: TestFiledKeyMapping.linkItems,
    source: false,
    fieldType: TestFieldTypeKeyMapping.linkItems,
  },
  status: {
    key: TestFiledKeyMapping.status,
    source: false,
    fieldType: TestFieldTypeKeyMapping.status,
  },
  testSet: {
    key: TestFiledKeyMapping.testSet,
    source: true,
    fieldType: TestFieldTypeKeyMapping.testSet,
  },
  count: {
    key: 'count',
    name: '事项数',
    compute: 'count',
  },
  testManagerIqlContext: { iqlContext: { displayContext: 'test_manager' } },
  statisticsRunAggs: (snapshot = false, fields = []) => {
    const field = snapshot
      ? 'r_test_manager_referenceCaseSnapshot#r_test_manager_es_text_keyword'
      : 'r_test_manager_referenceCase#r_test_manager_es_text_keyword';
    return {
      statistics_plan: {
        terms: {
          field: 'r_test_manager_plan#Text.keyword',
        },
        aggs: {
          statistics: {
            terms: {
              field: field,
              size: 99999,
            },
            aggs: {
              statistics: {
                top_hits: {
                  sort: [
                    {
                      updatedAt: {
                        order: 'desc',
                        missing: '_last', // 处理空值排序
                        unmapped_type: 'date', // 兼容字段不存在情况
                      },
                    },
                  ],
                  size: 1,
                  _source: [
                    'r_test_manager_status#r_test_manager_es_text_keyword',
                    'key',
                    field,
                    'r_test_manager_plan#Text',
                    ...fields,
                  ],
                },
              },
            },
          },
        },
      },
    };
  },
};

// 基础报表统计接口
export function statisticsApi(data, chartName = 'normal-aggs-chart'): Promise<{ payload: any }> {
  return requestCoreApi('POST', `/parse/api/report/${chartName}/search`, data) as any;
}

// 根据测试执行id获取
export async function statisticsPassingRateFromExecution(ids) {
  const iql = `${BuiltinFieldNameMapping.linkItems} in [${ids.map(i => `'${i}'`)}] and ${
    BuiltinFieldNameMapping.type
  } = '${TestType.Run}'`;
  const { payload: data } = await statisticsApi({
    group: [condition.linkItems, condition.status],
    value: [condition.count],
    iql,
    ...condition.testManagerIqlContext,
  });
  return data;
}

// 根据测试计划id,获取规划的用例总数
export async function statisticsCaseFromPlan(
  ids: string[],
): Promise<{ count: number; value: Record<string, any>[] }> {
  const iql = `${BuiltinFieldNameMapping.linkItems} in [${ids.map(i => `'${i}'`)}] and ${
    BuiltinFieldNameMapping.type
  } = '${TestType.Case}'`;
  const { payload: data } = await statisticsApi({
    group: [condition.linkItems],
    value: [condition.count],
    iql,
    ...condition.testManagerIqlContext,
  });
  return data;
}

// 根据测试用例集id,获取规划的用例总数
export async function statisticsCaseFromTestSet(
  ids: string[],
): Promise<{ count: number; value: Record<string, any>[] }> {
  const iql = `${BuiltinFieldNameMapping.testSet} in [${ids.map(i => `'${i}'`)}] and ${
    BuiltinFieldNameMapping.type
  } = '${TestType.Case}'`;
  const { payload: data } = await statisticsApi({
    group: [condition.testSet],
    value: [condition.count],
    iql,
    ...condition.testManagerIqlContext,
  });
  return data;
}

// 根据测试计划id，去查计划详情
export async function fetchPlanFromId(ids) {
  const {
    data: { list: plans },
  } = await iqlRequest({
    query: {
      type: TestType.Plan,
    },
    linkQuery: {
      linkType: TestLinkType.CaseLinkPlan,
      sourceIds: [ids],
      destinationType: TestType.Plan,
    },
    fields: ['name'],
    pagination: { limit: InfinityLimit },
  });
  return plans;
}

// 根据测试用例id，去查测试执行
export async function fetchRunFromCase(id) {
  const {
    data: { list: plans },
  } = await iqlRequest({
    query: {
      type: TestType.Run,
      referenceCase: id,
    },
    fields: ['name', TestFiledKeyMapping.plan],
    pagination: { limit: InfinityLimit },
  });
  return plans;
}

// 根据测试执行id,去查测试执行详情
export async function fetchExecutionFromId(ids) {
  const {
    data: { list: plans },
  } = await iqlRequest({
    query: {
      type: TestType.Execution,
      id: ids,
    },
    fields: ['name'],
    pagination: { limit: InfinityLimit },
  });
  return plans;
}

// 根据测试计划id,去查测试执行任务
export async function fetchExecutionFromPlan(ids) {
  const {
    data: { list: executions },
  } = await iqlRequest({
    query: {
      type: TestType.Execution,
    },
    linkQuery: {
      linkType: TestLinkType.ExecutionLinkPlan,
      sourceIds: ids,
      destinationType: TestType.Execution,
    },
    fields: ['name'],
    pagination: { limit: InfinityLimit },
  });
  return executions;
}

// 根据用例id，查出最新的测试执行
export async function statisticsRunFromCase(planId, ids, fields = []) {
  let iql = `(${BuiltinFieldNameMapping.referenceCase} in [${ids.map(i => `'${i}'`)}] or ${
    BuiltinFieldNameMapping.referenceCaseSnapshot
  } in [${ids.map(i => `'${i}'`)}]) and ${BuiltinFieldNameMapping.type} = '${TestType.Run}'`;
  if (planId) {
    iql += ` and test_manager_plan = '${planId}'`;
  }
  // 组装自定义aggs
  const {
    payload: [data],
  } = await statisticsApi(
    {
      iql,
      // @TODO 处理版本快照下的统计
      nativeAggs: condition.statisticsRunAggs(false, fields),
      ...condition.testManagerIqlContext,
    },
    'native-aggs-chart',
  );
  console.log('statisticsApi', data);
  // 组装数据
  const list = data.aggregations.statistics_plan.buckets;
  return list;
}

// 根据测试计划id,去查最新的测试执行，同一个用例只取最新的状态
export async function statisticsRunFromPlan(planId: string[]) {
  const planIql = planId.map(i => `${BuiltinFieldNameMapping.plan} = '${i}'`).join(' or ');
  const iql = `(${planIql}) and ${BuiltinFieldNameMapping.type} = '${TestType.Run}'`;
  // 组装自定义aggs
  const {
    payload: [data],
  } = await statisticsApi(
    {
      iql,
      nativeAggs: condition.statisticsRunAggs(),
      ...condition.testManagerIqlContext,
    },
    'native-aggs-chart',
  );
  // 组装数据
  const list = data.aggregations.statistics_plan.buckets;
  return list;
}

// 计算测试用例与最新状态的关系
export function computeCaseStatus(planId: string, list) {
  const target = list.find(i => i.key === planId.toLocaleLowerCase());
  if (!target) return {};
  const targetList = target.statistics?.buckets;
  const result = {} as any;
  targetList.forEach(i => {
    const _case =
      i.statistics.hits.hits[0]?._source[
        'r_test_manager_referenceCase#r_test_manager_es_text_keyword'
      ];
    result[_case] =
      i.statistics.hits.hits[0]?._source['r_test_manager_status#r_test_manager_es_text_keyword'];
  });
  return result;
}

// 计算统计结果
export function computeStatusCount(planId: string, list, total) {
  const target = list.find(i => i.key === planId.toLocaleLowerCase());
  if (!target) return {};

  const targetList = target.statistics?.buckets;

  const result = {} as any;
  targetList.forEach(i => {
    const stats =
      i.statistics.hits.hits[0]?._source['r_test_manager_status#r_test_manager_es_text_keyword'];
    if (result[stats]) {
      result[stats] = result[stats] + 1;
    } else {
      result[stats] = 1;
    }
  });

  const currentTotal = targetList.length;
  // 需要补全数量
  if (total > currentTotal) {
    result.TODO = (result.TODO || 0) + total - currentTotal;
  }

  return result;
}

// 获取测试执行任务规划的测试执行数量
export async function getExecutionCases(executionIds: string[]) {
  const iql = `${BuiltinFieldNameMapping.linkItems} in [${executionIds.map(i => `'${i}'`)}] and ${
    BuiltinFieldNameMapping.type
  } = '${TestType.Run}'`;

  console.info('getExecutionCases', iql);
  const { payload: data } = await statisticsApi({
    group: [condition.linkItems],
    value: [condition.count],
    iql,
    ...condition.testManagerIqlContext,
  });
  return data;
}
