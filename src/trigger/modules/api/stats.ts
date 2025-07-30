/**
 * @file 测试用例相关统计
 */
import { getParseQuery } from '@giteeteam/apps-team-api';

import {
  BuiltinFieldNameMapping,
  InfinityLimit,
  StartStatusKey,
  SystemField,
  TestConfigClassName,
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
  TestSetStatsPayload,
} from '../../../common/types/api';
import { TestEntity } from '../../../common/types/test';
import iqlSearchParamsBuilder from '../../../common/utils/iqlSearchParamsBuilder';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { CASESNAPSHOT_TYPE } from '../../lib/constants';
import { aggsSearch } from '../../lib/coreApi';
import { getPayload, iqlRequest } from '../../lib/iqlRequest';
import {
  computeCaseStatus,
  computeStatusCount,
  statisticsCaseFromPlan,
  statisticsCaseFromTestSet,
  statisticsRunFromCase,
  statisticsRunFromPlan,
} from '../../lib/statistics';

type TestRunEntityType = TestEntity<TestType.Run>;
// type TestCaseEntityType = TestEntity<TestType.Case>;
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
    body: { select, planIds },
  } = getReqInfoFromVMRuntime<TestPlanStatsPayload>();
  const result = buildStatsResult(planIds, select, {
    caseCount: 0,
    caseStatus: {},
    executionCount: 0,
  });
  try {
    // 获取用例数量与各用例最新的测试执行
    const [{ value: caseCounts }, caseStatus] = await Promise.all([
      statisticsCaseFromPlan(planIds),
      statisticsRunFromPlan(planIds),
    ]);
    // 记录数量
    caseCounts.forEach(i => {
      const _planId = i.r_test_manager_linkItems;
      if (!Object.hasOwnProperty.call(result, _planId)) return;
      result[_planId].caseCount = i.count;
    });
    console.info('查看统计数据 caseStatus -> ', caseStatus);
    // 记录状态
    planIds.forEach(_planId => {
      // 统计查询结果
      result[_planId].caseStatus = computeStatusCount(
        _planId,
        caseStatus,
        result[_planId].caseCount,
      );
    });
    console.info('查看统计数据 results -> ', result);
    // 测试执行任务统计数据
    if (select.includes('executionCount')) {
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
        linkItems.forEach(planId => {
          // 不在 result plan 中的数据不需要被统计
          if (!Object.hasOwnProperty.call(result, planId)) return;
          const planStats = result[planId];
          planStats.executionCount = (planStats.executionCount ?? 0) + 1;
        });
      });
    }
    return buildResponse(result);
  } catch (err) {
    return buildResponse(err);
  }
};

/**
 * 测试执行统计
 * （测试执行通过率）
 */
export const testExecutionStats = async () => {
  const {
    body: { select = [], executionIds, workspaceKey },
  } = getReqInfoFromVMRuntime<TestExecutionStatsPayload>();

  const taskPool = buildStatsTaskPool();

  // 测试执行用例统计数据
  taskPool.register(['runStatus', 'runCount'], async function (result) {
    let caseSnapshot: any = {};
    if (workspaceKey) {
      caseSnapshot = await getParseQuery(false, TestConfigClassName)
        .equalTo('workspaceKey', workspaceKey)
        .first({ useMasterKey: true })
        .then(item =>
          global.env?.ENABLED_CASE_SNAPSHOT
            ? item.get('caseSnapshot')
            : global.env?.DEFAULT_ENABLED_CASE_SNAPSHOT,
        );
    }
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
      selector: [CASESNAPSHOT_TYPE.AUTO_BUILDVERSION].includes(caseSnapshot?.type)
        ? `${BuiltinFieldNameMapping.referenceCaseSnapshot} is not null`
        : `${BuiltinFieldNameMapping.referenceCase} is not null`,
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
    const caseStatus = await statisticsRunFromCase(planId, caseIds);
    console.info('查看caseLatestStatus', caseStatus);
    const res = computeCaseStatus(planId, caseStatus);
    console.info('查看computeCaseStatus', res);
    Object.keys(res).forEach(caseId => {
      const stats = result[caseId];
      stats.caseLatestStatus = res[caseId];
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
  //  todo 参考这个做用例集梳理统计
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
      andCompositionIqlStr: params.selector,
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

/**
 * 测试用例集统计数据
 * （规划用例数）
 */
export const testSetStats = async () => {
  const {
    body: { select, testSetIds },
  } = getReqInfoFromVMRuntime<TestSetStatsPayload>();
  const result = buildStatsResult(testSetIds, select, {
    caseCount: 0,
  });

  console.info('testSetStats result init', JSON.stringify(result));
  try {
    // 获取用例数量与各用例最新的测试执行

    const { value: caseCounts } = await statisticsCaseFromTestSet(testSetIds);
    console.info('testSetStats statisticsCaseFromTestSet', JSON.stringify(caseCounts));

    // 记录数量
    caseCounts.forEach(i => {
      const testSetId = i[TestFiledKeyMapping.testSet];
      if (!Object.hasOwnProperty.call(result, testSetId)) return;
      result[testSetId].caseCount = i.count;
    });
    console.info('testSetStats results -> ', JSON.stringify(result));
    return buildResponse(result);
  } catch (err) {
    return buildResponse(err);
  }
};
