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
import { queryWorkspace } from '../../lib/coreApi';
import { concatIqlRequestFields, toArray } from '../../lib/helper';
import { dataFetcher } from '../../lib/initialization';
import { iqlRequest } from '../../lib/iqlRequest';
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
      fields: concatIqlRequestFields(fields),
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
    const { body } = getReqInfoFromVMRuntime<QueryTestEntityPayload>();

    const { query, fields, limit, offset, ascending, descending } = body;

    return iqlRequest({
      query,
      fields: concatIqlRequestFields(fields),
      pagination: { limit, offset },
      ascending,
      descending,
    });
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
    const statusMap = await getParseQuery(true, 'Status')
      .containedIn('objectId', statusIds)
      .find({ json: true })
      .then(status => status.reduce((prev, cur) => ({ ...prev, [cur.objectId]: cur.name }), {}));
    currentTestConfig.testRunAction.statusList.forEach(s => (s.name = statusMap[s.statusId]));
  }
  return {
    workspace,
    currentTestConfig,
    globalTestConfig,
  };
}
