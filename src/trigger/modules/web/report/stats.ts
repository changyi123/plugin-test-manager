/**
 * @file 测试管理报表统计数据
 * @prams {Array} testPlanIds 测试计划 Ids
 * */
import { i18n } from '@giteeteam/apps-api';
import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';

import { TestLinkType, TestType } from '../../../../common/constant';
import { iqlRequest } from '../../../lib/iqlRequest';
import { testEntityFieldTypeValidator } from '../../../lib/validator';

const APP_KEY = global.appKey ?? 'test_manager';

// 压缩响应数据大小，移除无用数据字段
const compactData = (data, extraKeys = [] as string[]) => {
  function pick(object, paths) {
    if (!paths) return object;
    let index = -1;
    const length = paths.length;
    const result = {};

    while (++index < length) {
      const path = paths[index];
      const value = object[path];
      result[path] = value;
    }
    return result;
  }
  // 获取需要被忽略的数据 key
  const getIgnoredDataKeys = data => {
    switch (data.className) {
      case 'Item':
        return ['objectId', 'className', 'createdAt', 'values', 'name', 'key'].concat(extraKeys);
      case 'Status':
        return ['objectId', 'className', 'name', 'type'].concat(extraKeys);
      case 'test_manager_Test':
        return [
          'type',
          'status',
          'objectId',
          'className',
          'reference',
          'runDetail',
          'detailStatus',
        ].concat(extraKeys);
      default:
        return null;
    }
  };

  // 事项类型数据
  if (Array.isArray(data)) {
    return data.map(item => pick(item, getIgnoredDataKeys(item ?? {})));
  }

  return pick(data, getIgnoredDataKeys(data ?? {}));
};

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};

const hasArrayItem = arr => Boolean(Array.isArray(arr) && arr.length);

const getItemData = async (ids, config = {} as Record<string, any>) => {
  const itemQuery = await getParseQuery(false, 'Item');

  itemQuery.containedIn('objectId', ids);

  if (config.workspace) {
    itemQuery.equalTo('workspace', config.workspace);
  }

  if (hasArrayItem(config.include)) {
    itemQuery.include(config.include);
  }

  if (hasArrayItem(config.select)) {
    itemQuery.select(config.select);
  }

  if (hasArrayItem(config.ascendingBy)) {
    itemQuery.addAscending(config.ascendingBy);
  } else if (config.descendingBy) {
    itemQuery.addDescending(config.descendingBy);
  }

  if (config.queryParams && typeof config.queryParams === 'object') {
    const { queryParams } = config;
    itemQuery.limit(queryParams.limit ?? 10);
    (itemQuery as any).skip(queryParams.offset ?? 0);
  }

  const data = await itemQuery.find({ ...ParseBaseQueryOptions } as any);

  return data?.map(d => d.toJSON()) ?? [];
};

const getDefectId = datas => {
  const runDetails = datas?.map(d => d?.runDetail).filter(Boolean) ?? [];

  const stepDefectIds = runDetails
    .filter(d => d?.steps)
    .map(d => d.steps)
    .flat()
    .map(d => d.defectItemIds ?? [])
    .flat();
  const runDefectItemIds = runDetails.map(d => d?.defectItemIds ?? []).flat();
  return [...new Set([...stepDefectIds, ...runDefectItemIds])].filter(Boolean);
};

/** 获取全局配置文件 */
const getGlobalConfig = async () => {
  const testConfigQuery = await getParseQuery(false, `${APP_KEY}_TestConfig`);
  const globalConfig = await testConfigQuery
    .equalTo('global', true)
    .first({ ...ParseBaseQueryOptions } as any);

  const { extra } = globalConfig.toJSON();

  return extra ?? {};
};

const getDefectStatusList = async defectId => {
  if (!defectId) return [];
  const res = await requestCoreApi('GET', `/parse/api/workflows/item/${defectId}`);

  return (res as any)?.nodes ?? [];
};

const queryTestEntity = async props => {
  const { offset, limit, ascending, query = {}, selector, descending } = props;
  return iqlRequest({
    query,
    selector,
    ascending,
    descending,
    pagination: { limit, offset },
  });
};

const queryLinkedTestEntity = async props => {
  const { limit, query, offset, linkQuery, selector, ascending, descending } = props;

  // 请求参数校验
  testEntityFieldTypeValidator({
    linkType: linkQuery.linkType,
    type: linkQuery.destinationType,
    linkItems: linkQuery.sourceIds,
  });

  return iqlRequest({
    query,
    selector,
    ascending,
    descending,
    pagination: { limit, offset },
    linkQuery,
  });
};

const getLinkMap = (datas, planId?: string) => {
  // 一个测试执行任务只能在一个测试计划关系，一个测试执行执行在一个测试执行任务关系
  const linkMap = new Map();

  datas.forEach(item => {
    const mapItemKey = planId ?? item.linkItems[0];
    const mapitemValue = linkMap.get(mapItemKey) ?? [];

    linkMap.set(mapItemKey, [...mapitemValue, item]);
  });

  return linkMap;
};

export async function main() {
  try {
    const { testPlanIds } = global.body ?? {};

    // 查询测试执行计划
    const [
      {
        data: { list: testPlanData },
      },
      {
        data: { list: caseData },
      },
      {
        data: { list: testExecutionData },
      },
      globalConfig,
    ] = await Promise.all([
      queryTestEntity({
        query: {
          id: testPlanIds,
          type: TestType.Plan,
        },
        limit: 9999,
      }),
      queryLinkedTestEntity({
        linkQuery: {
          linkType: TestLinkType.CaseLinkPlan,
          sourceIds: testPlanIds,
          destinationType: TestType.Case,
        },
        limit: 9999,
      }),
      queryLinkedTestEntity({
        linkQuery: {
          linkType: TestLinkType.ExecutionLinkPlan,
          sourceIds: testPlanIds,
          destinationType: TestType.Execution,
        },
        limit: 9999,
      }),
      getGlobalConfig(),
    ]);

    const {
      data: { list: testRunData },
    } = await queryLinkedTestEntity({
      linkQuery: {
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: (testExecutionData as any[])?.map(d => d.id),
        destinationType: TestType.Run,
      },
      limit: 9999,
    });

    const defectItem = await getItemData(getDefectId(testRunData), {
      queryParams: {
        limit: 9999,
      },
      include: ['status', 'values'],
      select: ['status', 'values', 'name', 'key'],
      ascendingBy: ['createdAt'],
    });

    const defectId = (defectItem?.[0] as any)?.objectId ?? '';

    const defectStatusList = await getDefectStatusList(defectId);

    const testRuns = getLinkMap(testRunData);
    // TODO 多个计划同时生成报告情况如何处理？
    const testExecution = getLinkMap(testExecutionData, testPlanIds?.[0]);

    const planStats = testPlanIds.map(planId => ({
      key: planId,
      allTestCases: compactData(caseData ?? []),
      reference: (testPlanData ?? []).find(d => d.objectId === planId),
      allTestExecutions: testExecution.get(planId)?.map(d => ({
        ...compactData(d),
        testRun: compactData(testRuns.get(d.objectId) ?? []),
      })),
      allDefects: defectItem?.map(d => ({
        ...compactData(d),
        status: compactData((d as any).status),
      })),
    }));

    return {
      planStats,
      globalConfig: {
        ...globalConfig,
        defectStatusList: defectStatusList
          .filter(d => d.statusId !== 'start_node')
          .map(d => ({
            id: d.id,
            statusId: d.statusId,
            key: d.key,
            name: d.name,
            type: d.type,
          })),
      },
    };
  } catch (err) {
    console.error('report stats error', err);
    return {
      error: [i18n.t('common.exportReportFail')],
    };
  }
}
