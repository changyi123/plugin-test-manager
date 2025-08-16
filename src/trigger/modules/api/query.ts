/**
 * @file 数据查询
 */
// app cli 不支持指定 tsconfig 需要使用相对路径
import { getParseQuery } from '@giteeteam/apps-team-api';
import { TestEntity } from 'common/types/test';
import pick from 'lodash/pick';

import {
  InfinityLimit,
  IQLRequiredFieldKeys,
  StartStatusKey,
  SystemField,
  SystemFieldNameMapping,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import {
  QueryCaseIdByStatusPayload,
  QueryLinkedTestEntityPayload,
  QueryTestEntityPayload,
} from '../../../common/types/api';
import { RewriteFieldKey } from '../../../common/utils/dataTransfer';
import { buildPaginationResponse, buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { iqlSearch, queryWorkspace } from '../../lib/coreApi';
import { concatIqlRequestFields, toArray } from '../../lib/helper';
import { dataFetcher } from '../../lib/initialization';
import { iqlRequest } from '../../lib/iqlRequest';
import { statisticsRunFromCase } from '../../lib/statistics';
import { testEntityFieldTypeValidator } from '../../lib/validator';

const overwriteIqlParamsWithOnlySelectId = onlySelectId => {
  if (onlySelectId) {
    return {
      dataTransfer: data => {
        return onlySelectId ? data.map(item => item.objectId) : data;
      },
      fields: IQLRequiredFieldKeys,
      pagination: { limit: InfinityLimit },
    };
  }
};

const overwriteIqlParamsWithSelect = select => {
  if (Array.isArray(select)) {
    // status字段在测试管理有重写，所以此处做下兼容
    const fields = Array.from(
      new Set(
        select
          .flatMap(key =>
            RewriteFieldKey[key]
              ? [TestFiledKeyMapping[key], key]
              : TestFiledKeyMapping[key] ?? key,
          )
          .filter(Boolean),
      ),
    );

    return {
      // select 只能筛选测试用例实体的 key
      dataTransfer: data => {
        return data.map(item =>
          pick(
            item,
            select.flatMap(key => (RewriteFieldKey[key] ? [RewriteFieldKey[key], key] : key)),
          ),
        );
      },
      fields,
    };
  }
};

/** 查询测试类型实体数据 */
export const queryTestEntity = async () => {
  console.time('test-manager-iqlSearch-queryTestEntity');
  const { body } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();
  const {
    offset,
    limit,
    select,
    fields,
    ascending,
    query = {},
    selector,
    descending,
    onlySelectId,
    sortByRepositoryIds,
    notConcatField,
  } = body;

  const res = await iqlRequest({
    query,
    selector,
    ascending,
    descending,
    sortByRepositoryIds,
    pagination: { limit, offset },
    fields: notConcatField ? fields : concatIqlRequestFields(fields),
    ...overwriteIqlParamsWithOnlySelectId(onlySelectId),
    ...overwriteIqlParamsWithSelect(select),
  });
  console.timeEnd('test-manager-iqlSearch-queryTestEntity');
  return res;
};

/** 查询关联的测试实体数据 */
export const queryLinkedTestEntity = async () => {
  try {
    const { body } = getReqInfoFromVMRuntime<QueryLinkedTestEntityPayload>();
    const {
      limit,
      query,
      fields,
      offset,
      select,
      linkType,
      selector,
      ascending,
      descending,
      onlySelectId,
      destinationType,
      sortByRepositoryIds,
      sourceIds: originalSourceIds,
      notConcatField = false,
    } = body;

    const sourceIds = toArray(originalSourceIds).filter(Boolean);
    // 请求参数校验
    testEntityFieldTypeValidator({ linkType, type: destinationType, linkItems: sourceIds });

    return iqlRequest({
      query,
      selector,
      ascending,
      descending,
      sortByRepositoryIds,
      pagination: { limit, offset },
      linkQuery: {
        linkType,
        sourceIds,
        destinationType,
      },
      fields: notConcatField ? fields : concatIqlRequestFields(fields),
      ...overwriteIqlParamsWithOnlySelectId(onlySelectId),
      ...overwriteIqlParamsWithSelect(select),
    });
  } catch (err) {
    return buildPaginationResponse(err);
  }
};

/** 查询测试计划下用例的最新执行状态 */
export const queryCaseIdByStatus = async () => {
  const { body } = getReqInfoFromVMRuntime<QueryCaseIdByStatusPayload>();
  const { planId, status: statusData, isExclude } = body;

  // 格式化 status 字段, 保证 status 是数组
  const status = Array.isArray(statusData)
    ? statusData
    : statusData === null
    ? statusData
    : [statusData];

  // 查询计划关联的所有的用例
  const linkedTestCases = await iqlRequest<TestEntity<TestType.Case>>({
    query: {
      type: TestType.Case,
    },
    linkQuery: {
      sourceIds: [planId],
      linkType: TestLinkType.CaseLinkPlan,
      destinationType: TestType.Case,
    },
    pagination: { limit: InfinityLimit },
    fields: [SystemFieldNameMapping.id, TestFiledKeyMapping.caseStatus],
  });

  // 过滤指定状态下的所有用例
  const ret = linkedTestCases.data.list
    .map(testCase => {
      // 如果没有 caseStatus 字段, 默认为 TODO 状态
      const status = testCase.caseStatus?.[planId] ?? StartStatusKey;
      return {
        status,
        id: testCase.objectId,
      };
    })
    .filter(item => {
      // 当状态为 null 时, 表示查询所有状态
      if (status === null) {
        return isExclude;
      }
      // 处理包含和不包含的情况
      const isIncludeStatus = status.includes(item.status);

      return isExclude ? !isIncludeStatus : isIncludeStatus;
    })
    .map(item => item.id);

  return buildResponse(ret);
};

/** 查询测试用例的执行记录 */
export const queryCaseRunRecords = async () => {
  // 查询测试用例关联的测试执行
  const queryRuns = async () => {
    const { body } = getReqInfoFromVMRuntime<{ statistics?: boolean } & QueryTestEntityPayload>();

    const { query, fields, limit, offset, ascending, descending, statistics } = body;

    if (!statistics) {
      return iqlRequest({
        query,
        fields: concatIqlRequestFields(fields),
        pagination: { limit, offset },
        ascending,
        descending,
      });
    } else {
      const staticsRuns = await statisticsRunFromCase(
        null,
        [query.referenceCase],
        [
          'id',
          'r_test_manager_status#r_test_manager_es_text_keyword',
          'r_test_manager_executor#User',
          'r_test_manager_executeTime#Date',
          'r_test_manager_executeCount#Number',
          'r_test_manager_linkItems#r_test_manager_es_array_keyword',
          'r_test_manager_plan#Text',
        ],
      );
      const runs = {
        data: {
          list: [],
          total: 0,
        },
      };
      const userSet = new Set();

      staticsRuns.forEach(item => {
        item.statistics?.buckets?.forEach(bucket => {
          bucket?.statistics?.hits?.hits?.forEach(doc => {
            const source = doc._source;
            if (!source) return;
            const run = {
              objectId: source.id,
              status: source['r_test_manager_status#r_test_manager_es_text_keyword'],
              executorIds: source['r_test_manager_executor#User'] || [],
              executeCount: source['r_test_manager_executeCount#Number'],
              executeTime: source['r_test_manager_executeTime#Date'],
              linkItems: source['r_test_manager_linkItems#r_test_manager_es_array_keyword'],
              plan: source['r_test_manager_plan#Text'],
            };

            runs.data.list.push(run);
            runs.data.total += 1;
            run.executorIds.forEach(id => userSet.add(id));
          });
        });
      });

      console.info(
        'queryCaseRunRecords',
        'queryRuns',
        JSON.stringify({ runs, staticsRuns, userSet: [...userSet] }),
      );

      const userMap = new Map();
      if (userSet.size) {
        const users = await getParseQuery(false, '_User')
          .containedIn('objectId', [...userSet])
          .select(['username', 'nickname', 'objectId', 'deleted'])
          .findAll({
            useMasterKey: true,
          });

        users.forEach(user =>
          userMap.set(user.id, {
            deleted: user.get('deleted'),
            value: user.get('objectId'),
            nickname: user.get('nickname'),
            username: user.get('username'),
            label: `${user.get('nickname')}(${user.get('username')})`,
          }),
        );
      }

      console.info('queryCaseRunRecords', 'queryRuns', JSON.stringify({ runs, staticsRuns }));

      runs.data.list.forEach(run => {
        run.executor = run.executorIds.length ? run.executorIds.map(id => userMap.get(id)) : [];
      });

      return runs;
    }
  };

  // 查询测试执行关联的测试执行任务
  const queryExecutions = async runIds => {
    return iqlRequest({
      linkQuery: {
        sourceIds: runIds,
        linkType: TestLinkType.RunLinkExecution,
        destinationType: TestType.Execution,
      },
      fields: [
        SystemFieldNameMapping.id,
        SystemFieldNameMapping.name,
        TestFiledKeyMapping.linkItems,
      ],
      pagination: { limit: InfinityLimit },
    });
  };

  // 查询测试执行任务关联的测试执行计划
  const queryPlans = async executionIds => {
    return iqlRequest({
      linkQuery: {
        sourceIds: executionIds,
        linkType: TestLinkType.ExecutionLinkPlan,
        destinationType: TestType.Plan,
      },
      fields: [SystemFieldNameMapping.id, SystemFieldNameMapping.name],
      pagination: { limit: InfinityLimit },
    });
  };

  const arrayToMap = array => {
    if (!Array.isArray(array)) return {};
    return array.reduce((result, current) => {
      result[current.objectId] = current;
      return result;
    }, {});
  };
  try {
    // 查询测试执行
    const runs = await queryRuns();

    const runIds = runs?.data?.list.map(run => run.objectId);

    if (!runIds.length) return runs;

    // 查询测试执行任务
    const executions = await queryExecutions(runIds);

    const executionIds = executions?.data?.list?.map(execution => execution.objectId);

    // 查询测试计划
    const plans = await queryPlans(executionIds);
    const executionMap = arrayToMap(executions?.data?.list);

    const planMap = arrayToMap(plans?.data?.list);

    runs.data.list = runs.data.list.map(run => {
      const executionId = run?.linkItems?.[0];
      const linkedExecution = executionMap[executionId];

      const planId = linkedExecution?.linkItems?.[0];
      const linkedPlan = planMap[planId];

      return {
        linkedExecution,
        linkedPlan,
        ...run,
      };
    });
    return runs;
  } catch (err) {
    return buildPaginationResponse(err);
  }
};

/** 查询测试执行记录列表 */
export const queryRunRecords = async () => {
  const { body } = getReqInfoFromVMRuntime<any>();

  const handleRes = res => {
    return res?.payload?.items || [];
  };

  const arrayToMap = array => {
    if (!Array.isArray(array)) return {};
    return array.reduce((result, current) => {
      result[current.objectId] = current;
      return result;
    }, {});
  };

  // 查询测试用例关联的测试执行
  const queryRuns = async () => {
    return iqlSearch({
      ...body,
      fields: [],
    });
  };

  // 查询测试执行关联的测试执行任务
  const queryExecutions = async executionIds => {
    if (!executionIds.length) return [];
    return iqlSearch({
      iql: `id in ${JSON.stringify(executionIds)}`,
      fields: [SystemField.Id, SystemField.Name, SystemField.Workspace],
      size: InfinityLimit,
    })
      .then(handleRes)
      .then(arrayToMap);
  };

  // 处理所属模块路径
  const getRepoFullPathMap = repositoryData => {
    const pathMap = {};
    // 创建一个哈希表，用于存储每个path对象的子对象
    repositoryData.forEach(repo => {
      pathMap[repo.objectId] = pathMap[repo.objectId] || [repo.name];
    });

    // 遍历repositoryData，将每个父对象的path对象添加到当前pathMap
    repositoryData.forEach(repo => {
      if (repo.parent) {
        if (pathMap[repo.parent.objectId]) {
          pathMap[repo.objectId].unshift(pathMap[repo.parent.objectId]);
        }
      }
    });

    // 将pathMap的每一项转为路径
    repositoryData.forEach(repo => {
      if (pathMap[repo.objectId]) {
        pathMap[repo.objectId] = pathMap[repo.objectId].flat(Infinity).join('/');
      }
    });

    return new Map<string, string>(Object.entries(pathMap));
  };

  // 查询测试执行关联的测试执行任务
  const handleRepository = async cases => {
    const workspaceKey = cases?.[0]?.workspace?.key;
    if (!workspaceKey) return cases;
    const repoMap = await getParseQuery(true, 'Repository')
      .equalTo('workspaceKey', workspaceKey)
      .select(['name', 'objectId', 'parent'])
      .findAll({ useMasterKey: true })
      .then(data => data.map(i => i.toJSON()))
      .then(getRepoFullPathMap);
    console.info('handleRepository', repoMap);
    return cases.map(caseItem => {
      const repoId = caseItem.values?.r_test_manager_repository;
      if (!repoId || !repoMap.has(repoId)) return caseItem;
      caseItem.values.r_test_manager_repository = repoMap.get(repoId) ?? '';
      return caseItem;
    });
  };

  // 查询测试执行对应的测试用例
  const queryCases = async caseIds => {
    if (!caseIds.length) return [];
    return iqlSearch({
      iql: `id in ${JSON.stringify(caseIds)}`,
      size: InfinityLimit,
    })
      .then(handleRes)
      .then(async cases => await handleRepository(cases))
      .then(arrayToMap);
  };

  try {
    // 查询测试执行
    const runRes = await queryRuns();
    const runs = handleRes(runRes);
    console.info('queryRunRecords', runs);
    if (!runs?.length) return [];

    const executionIds = [];
    const caseIds = [];
    const runIds = [];
    runs.forEach(run => {
      runIds.push(run.objectId);
      const executionId = run?.values?.r_test_manager_linkItems?.[0];
      if (executionId) {
        executionIds.push(executionId);
      }
      const caseId = run?.values?.r_test_manager_referenceCase;
      if (caseId) {
        caseIds.push(caseId);
      }
    });

    // 查询测试执行任务和测试用例
    const [executionMap, caseMap] = await Promise.all([
      queryExecutions(executionIds),
      queryCases(caseIds),
    ]);
    console.info('queryExecutionsAndCases', executionIds, caseIds, executionMap, caseMap);

    const list = runs.map(run => {
      const executionId = run?.values?.r_test_manager_linkItems?.[0];
      const linkedExecution = executionMap[executionId];
      const caseId = run?.values?.r_test_manager_referenceCase;
      const referenceCase = caseMap[caseId];

      if (referenceCase?.values) {
        referenceCase.values = {
          ...run.values,
          ...referenceCase.values,
        };
      }

      return {
        linkedExecution,
        ...(referenceCase ?? run),
      };
    });
    return {
      list,
      total: runRes?.payload?.count,
    };
  } catch (err) {
    return buildPaginationResponse(err);
  }
};

// 查询初始化需要的数据
export async function queryBasicData() {
  const {
    body: { workspaceKey },
  } = getReqInfoFromVMRuntime<{ workspaceKey: string }>();
  // 空间与测试管理配置
  const [workspace, [currentTestConfig], globalTestConfig] = await Promise.all([
    queryWorkspace({
      workspaceKeyOrId: workspaceKey,
      include:
        'itemTypeScheme,itemTypeScreenScheme,itemTypeScreenScheme.defaultScreenScheme,itemTypeScreenScheme.itemTypeScreenSchemeMappings,workflowScheme',
    }),
    dataFetcher.getTestConfigs([workspaceKey]),
    dataFetcher.getGlobalTestConfig(),
  ]);
  // 测试执行状态映射
  const statusIds =
    currentTestConfig?.testRunAction?.statusList?.map(status => status.statusId) || [];
  if (statusIds?.length) {
    const statusMap = await getParseQuery(false, 'Status')
      .select(['name'])
      .containedIn('objectId', statusIds)
      .findAll({ useMasterKey: true })
      .then(status => status.reduce((prev, cur) => ({ ...prev, [cur.id]: cur.get('name') }), {}));
    currentTestConfig.testRunAction.statusList.forEach(s => (s.name = statusMap[s.statusId]));
  }

  // todo 【申万生产】currentTestConfig.caseSnapshot返回值是字符串，但是应该返回对象。临时解决下
  if (typeof currentTestConfig.caseSnapshot === 'string' && currentTestConfig.caseSnapshot) {
    try {
      currentTestConfig.caseSnapshot = JSON.parse(currentTestConfig.caseSnapshot);
    } catch (error) {
      console.error('Failed to parse caseSnapshot:', error);
    }
  }

  if (typeof globalTestConfig.caseSnapshot === 'string' && globalTestConfig.caseSnapshot) {
    try {
      globalTestConfig.caseSnapshot = JSON.parse(globalTestConfig.caseSnapshot);
    } catch (error) {
      console.error('Failed to parse globalTestConfig caseSnapshot:', error);
    }
  }
  return {
    workspace,
    currentTestConfig,
    globalTestConfig,
  };
}
