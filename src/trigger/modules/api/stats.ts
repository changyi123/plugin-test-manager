/**
 * @file 测试用例相关统计
 */
import {
  InfinityLimit,
  StartStatusKey,
  SystemField,
  TestFieldTypeKeyMapping,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import {
  TestCaseStatsPayload,
  TestCountPayload,
  TestExecutionStatsPayload,
  TestPlanStatsPayload,
} from '../../../common/types/api';
import { TestEntity } from '../../../common/types/test';
import iqlSearchParamsBuilder from '../../../common/utils/iqlSearchParamsBuilder';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { aggsSearch } from '../../lib/coreApi';
import { getPayload, iqlRequest } from '../../lib/iqlRequest';

type TestRunEntityType = TestEntity<TestType.Run>;
type TestCaseEntityType = TestEntity<TestType.Case>;
type TestExecutionEntityType = TestEntity<TestType.Execution>;

/**
 * 生成 stats 的数据结构
 */
const buildStatsResult = (ids, selectKeys, defaultValues = {}) => {
  // {[id]: Record<selectKeys>: undefined}
  return ids.reduce(
    (acc, id) => ({
      ...acc,
      [id]: Object.fromEntries(selectKeys.map(key => [key, defaultValues?.[key]])),
    }),
    {},
  );
};

/** 任务池 */
const buildStatsTaskPool = () => {
  const tasks = [];
  let sharedVar = null;

  const res = {
    before: async dataFetch => {
      sharedVar = await dataFetch?.();
    },
    register: (name, task) => {
      tasks.push({ name, task });
      return res;
    },
    run: async (planIds, select = [], defaultValues) => {
      try {
        const result = buildStatsResult(planIds, select, defaultValues);

        const promisifyTasks = tasks
          .filter(task => {
            // 可能存在两个 select 共用同一个 task 的情况, 只要有一个 name 相等则返回
            if (Array.isArray(task.name)) {
              return select.some(name => task.name.includes(name));
            }
            return select.includes(task.name);
          })
          .map(({ task }) => typeof task === 'function' && task(result, sharedVar));

        await Promise.all(promisifyTasks);

        return buildResponse(result);
      } catch (err) {
        return buildResponse(err);
      }
    },
  };
  return res;
};

/**
 * 测试计划统计数据
 * （规划用例数，最新用例通过率，执行任务）
 */
export const testPlanStats = async () => {
  const {
    body: { select = [], planIds },
  } = getReqInfoFromVMRuntime<TestPlanStatsPayload>();

  const taskPool = buildStatsTaskPool();

  // 测试执行用例统计数据
  taskPool
    .register(['caseStatus', 'caseCount'], async function (result) {
      const {
        data: { list: testCases },
      } = await iqlRequest<TestCaseEntityType>({
        linkQuery: {
          sourceIds: planIds,
          linkType: TestLinkType.CaseLinkPlan,
          destinationType: TestType.Case,
        },
        fields: [SystemField.Id, TestFiledKeyMapping.caseStatus, TestFiledKeyMapping.linkItems],
        pagination: { limit: InfinityLimit, offset: 0 },
      });

      testCases.forEach(testCase => {
        const { caseStatus, source } = testCase;
        // 统计状态数据
        if (caseStatus) {
          Object.entries(caseStatus).forEach(([planId, statusKey]) => {
            // 不在 result plan 中的数据  or 当前计划未在 source 中不需要被统计
            if (!Object.hasOwnProperty.call(result, planId) || !source.includes(planId)) return;
            const planStats = result[planId];
            planStats.caseStatus = {
              ...planStats.caseStatus,
              [statusKey]: (planStats.caseStatus?.[statusKey] ?? 0) + 1,
            };
          });
        }

        // 统计用例数量
        source.forEach(planId => {
          // 不在 result plan 中的数据不需要被统计
          if (!Object.hasOwnProperty.call(result, planId)) return;
          const planStats = result[planId];
          planStats.caseCount = (planStats.caseCount ?? 0) + 1;
        });

        // 统计状态值为 undefined 的节点，变为起始节点
        Object.keys(result).forEach(planId => {
          const stats = result[planId];
          const processedStatusCount = (Object.values(stats.caseStatus) as any).reduce(
            (acc, num) => acc + num,
            0,
          );

          const StartStatusCount = stats.caseStatus[StartStatusKey] ?? 0;

          const resComputedStartStatusCount = Math.max(
            stats.caseCount - processedStatusCount + StartStatusCount,
            0,
          );

          result[planId] = {
            ...stats,
            caseStatus: {
              ...stats.caseStatus,
              [StartStatusKey]: resComputedStartStatusCount,
            },
          };
        });
      });
    })
    .register('executionCount', async function (result) {
      const {
        data: { list: testExecution },
      } = await iqlRequest<TestExecutionEntityType>({
        linkQuery: {
          sourceIds: planIds,
          linkType: TestLinkType.ExecutionLinkPlan,
          destinationType: TestType.Execution,
        },
        fields: [TestFiledKeyMapping.linkItems],
        pagination: { limit: InfinityLimit, offset: 0 },
      });

      testExecution.forEach(item => {
        const { linkItems } = item;

        // 统计测试执行数量
        if (select.includes('executionCount')) {
          linkItems.forEach(planId => {
            // 不在 result plan 中的数据不需要被统计
            if (!Object.hasOwnProperty.call(result, planId)) return;
            const planStats = result[planId];
            planStats.executionCount = (planStats.executionCount ?? 0) + 1;
          });
        }
      });
    });

  return taskPool.run(planIds, select, {
    caseCount: 0,
    caseStatus: {},
    executionCount: 0,
  });
};

/**
 * 测试执行统计
 * （测试执行通过率）
 */
export const testExecutionStats = async () => {
  const {
    body: { select = [], executionIds },
  } = getReqInfoFromVMRuntime<TestExecutionStatsPayload>();

  const taskPool = buildStatsTaskPool();

  // 测试执行用例统计数据
  taskPool.register(['runStatus', 'runCount'], async function (result) {
    const {
      data: { list: testRuns },
    } = await iqlRequest<TestRunEntityType>({
      linkQuery: {
        sourceIds: executionIds,
        linkType: TestLinkType.RunLinkExecution,
        destinationType: TestType.Run,
      },
      fields: [TestFiledKeyMapping.status, TestFiledKeyMapping.linkItems],
      pagination: { limit: InfinityLimit, offset: 0 },
    });

    testRuns.forEach(item => {
      const { status = StartStatusKey, source } = item;
      // 统计状态数据

      source.forEach(executionId => {
        if (!Object.hasOwnProperty.call(result, executionId)) return;

        const executionStats = result[executionId];

        if (select.includes('runStatus')) {
          executionStats.runStatus = {
            ...executionStats.runStatus,
            [status]: (executionStats?.runStatus[status] ?? 0) + 1,
          };
        }

        if (select.includes('runCount')) {
          executionStats.runCount = executionStats.runCount + 1;
        }
      });
    });
  });

  return taskPool.run(executionIds, select, {
    runStatus: {},
    runCount: 0,
  });
};

/**
 * 测试用例统计
 * （测试用例最新执行状态，执行任务数）
 */

export const testCaseStats = async () => {
  const {
    body: { caseIds, planId, select },
  } = getReqInfoFromVMRuntime<TestCaseStatsPayload>();

  const taskPool = buildStatsTaskPool();

  taskPool.register('caseLatestStatus', async function (result) {
    // 获取所有的测试用例
    const {
      data: { list: testCases },
    } = await iqlRequest<TestCaseEntityType>({
      query: {
        id: caseIds,
      },
      fields: [SystemField.Id, TestFiledKeyMapping.caseStatus],
      pagination: { limit: InfinityLimit, offset: 0 },
    });

    testCases?.forEach(testCase => {
      const { objectId, caseStatus } = testCase;
      const status = caseStatus?.[planId] ?? StartStatusKey;
      const stats = result[objectId];
      if (stats) {
        stats.caseLatestStatus = status;
      }
    });
  });

  taskPool.register('runCount', async function (result) {
    const {
      data: { list: testExecutionIds },
    } = await iqlRequest<string>({
      linkQuery: {
        linkType: TestLinkType.ExecutionLinkPlan,
        sourceIds: planId,
        destinationType: TestType.Execution,
      },
      fields: [SystemField.Id],
      pagination: { limit: InfinityLimit, offset: 0 },
      dataTransfer: data => data.map(item => item.objectId),
    });

    // 获取所有的测试执行
    const {
      data: { list: testCases },
    } = await iqlRequest<TestRunEntityType>({
      query: {
        referenceCase: caseIds,
      },
      linkQuery: {
        sourceIds: testExecutionIds,
        destinationType: TestType.Run,
        linkType: TestLinkType.RunLinkExecution,
      },
      fields: [SystemField.Id, TestFiledKeyMapping.referenceCase],
      pagination: { limit: InfinityLimit, offset: 0 },
    });

    testCases?.forEach(testCase => {
      const { referenceCase } = testCase;
      const stats = result[referenceCase];
      if (stats) {
        stats.runCount = (stats.runCount ?? 0) + 1;
      }
    });
  });

  return taskPool.run(caseIds, select, {
    runCount: 0,
    caseLatestStatus: StartStatusKey,
  });
};

/**
 * 统计通用接口
 * （测试用例引用次数，测试用例执行次数，规划用例数，测试用例最新执行状态）
 * 执行任务数，测试执行通过率(需计算)
 */
export const testCount = async () => {
  const {
    body: { groups, params, linkParams, sessionToken },
  } = getReqInfoFromVMRuntime<TestCountPayload>();
  const query = {} as any;

  if (groups) {
    // 处理 groups
    const handleGroups = groupInfo => {
      if (typeof groupInfo === 'string') {
        return [
          {
            key: TestFiledKeyMapping[groupInfo] ?? groupInfo,
            name: '',
            fieldType: TestFieldTypeKeyMapping[groupInfo] ?? groupInfo,
          },
        ];
      }
      return groupInfo.map(g => ({
        key: TestFiledKeyMapping[g] ?? g,
        name: '',
        fieldType: TestFieldTypeKeyMapping[g] ?? g,
      }));
    };
    query.group = handleGroups(groups);
  }

  if (params) {
    // 处理 params，获取统计范围 iql
    const payload = await getPayload(params);
    const { iql } = iqlSearchParamsBuilder({
      payload,
      limit: InfinityLimit,
      order: [],
    });
    query.iql = iql;
  }

  const getGroupedCaseCount = async ({ group, iql }) => {
    const {
      payload: { value: result },
    } = await aggsSearch({
      size: 99999,
      group,
      value: [
        {
          key: 'count',
          name: 'count',
          fieldType: 'count',
          compute: 'count',
        },
      ],
      iql,
      iqlContext: {
        displayContext: 'test_manager',
      },
    });
    return result;
  };

  const handleResult = (data, groupInfo) => {
    if (typeof groupInfo === 'string') {
      return data.map(d => ({
        [groupInfo]: d[TestFiledKeyMapping[groupInfo]],
        count: d.count,
      }));
    }

    const getGroupValue = (group, d) =>
      group.reduce(
        (prev, cur) => ({
          ...prev,
          [cur]: d[TestFiledKeyMapping[cur]],
        }),
        {},
      );

    return data.map(d => ({
      ...getGroupValue(groupInfo, d),
      count: d.count,
    }));
  };

  // 需要统计计划下的测试用例关联的测试执行
  if (linkParams) {
    const { planId, workspaceKey, caseIds } = linkParams;

    // 获取测试计划下的测试执行任务 id
    const {
      data: { list: testExecution },
    } = await iqlRequest<TestRunEntityType>({
      query: {
        workspaceKey,
      },
      linkQuery: {
        sourceIds: [planId],
        destinationType: TestType.Execution,
        linkType: TestLinkType.ExecutionLinkPlan,
      },
      fields: [SystemField.Id, TestFiledKeyMapping.referenceCase],
      pagination: { limit: InfinityLimit, offset: 0 },
    });

    const executionIds = testExecution?.map(d => d.objectId);
    const linkParam = {
      query: {
        workspaceKey,
        referenceCase: caseIds,
      },
      onlySelectId: false,
      linkType: TestLinkType.RunLinkExecution,
      destinationType: TestType.Run,
      sourceIds: executionIds,
      fields: [SystemField.Id, TestFiledKeyMapping.referenceCase],
      limit: InfinityLimit,
      sessionToken,
    };
    const payload = await getPayload(linkParam);
    const { iql: linkIql } = iqlSearchParamsBuilder({
      payload,
      limit: InfinityLimit,
      order: [],
    });
    query.iql = linkIql;
  }

  try {
    const groupData = await getGroupedCaseCount(query);
    return {
      code: 200,
      data: handleResult(groupData, groups),
    };
  } catch (error) {
    return {
      code: '202',
      message: error?.message ?? error,
    };
  }
};
