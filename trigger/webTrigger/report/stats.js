/**
 * @file 测试管理报表统计数据
 * @prams {Array} testPlanIds 测试计划 Ids
 * */

const APP_KEY = global.appKey ?? 'test_manager';

const testPlanIds = global?.body?.testPlanIds ?? [];

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};

const ExecutionRelRun = 'ExecutionRelRun';
const PlanRelExecution = 'PlanRelExecution';
const PlanRelDetail = 'PlanRelDetail';

const defaultConfig = {
  // 响应数据处理
  include: [],
  select: [],
  nameLike: '',
  workspaceKey: '',
  // 需要关联方 id
  needOriginSideId: true,
  // 需要关联关系数据
  needRelationData: true,
  ascendingBy: ['sortIndex', 'createdAt'],
  descendingBy: [],
  resultTransfer: data => data,
  queryParams: {
    limit: 10,
    offset: 0,
  },
};

const hasArrayItem = arr => Boolean(Array.isArray(arr) && arr.length);

const getRelationKey = side => Object.keys(side).filter(Boolean)[0];

const getTestEntityByRelation = async (relType, side, _config = {}) => {
  const testRelationQuery = await apis.getParseQuery(false, `${APP_KEY}_TestRelation`);
  const relKey = getRelationKey(side);
  const originalIds = side[relKey].filter(Boolean).map(item => item?.objectId ?? item);
  const config = Object.assign({}, defaultConfig, _config);
  const { include, select } = config;

  testRelationQuery.equalTo('relationType', relType).containedIn(relKey, originalIds);

  if (hasArrayItem(include)) {
    testRelationQuery.include(include);
  }

  if (hasArrayItem(select)) {
    testRelationQuery.include(select);
  }

  if (config.queryParams && typeof config.queryParams === 'object') {
    const { queryParams } = config;
    testRelationQuery.limit(queryParams.limit ?? 10);
    testRelationQuery.skip(queryParams.offset ?? 0);
  }

  const data = await testRelationQuery.find(ParseBaseQueryOptions);

  return data?.map(test => test.toJSON()) ?? [];
};

const getDefectItem = async (ids, config = {}) => {
  const itemQuery = await apis.getParseQuery(false, 'Item');

  itemQuery.containedIn('objectId', ids);

  if (config.workspace) {
    itemQuery.equalTo('workspace', config.workspace);
  }

  if (hasArrayItem(config.include)) {
    itemQuery.include(config.include);
  }

  if (hasArrayItem(config.select)) {
    itemQuery.include(config.select);
  }

  if (config.queryParams && typeof config.queryParams === 'object') {
    const { queryParams } = config;
    itemQuery.limit(queryParams.limit ?? 10);
    itemQuery.skip(queryParams.offset ?? 0);
  }

  const data = await itemQuery.find(ParseBaseQueryOptions);

  return data?.map(item => item.toJSON()) ?? [];
};

const getToByFrom = (datas, filed, isHanleRef = false) =>
  (datas ?? []).reduce((prev, cur) => {
    if (!prev[cur.from.objectId]?.reference && isHanleRef) {
      prev = {
        ...prev,
        [cur.from.objectId]: {
          ...(prev[cur.from.objectId] ?? {}),
          reference: cur.from.reference,
        },
      };
    }

    if (cur.from.objectId) {
      prev = {
        ...prev,
        [cur.from.objectId]: {
          ...(prev[cur.from.objectId] ?? {}),
          [filed]: (prev[cur.from.objectId]?.[filed] ?? []).concat(cur.to),
        },
      };
    }

    return prev;
  }, {});

const getDefectId = datas => {
  const runDetails = datas?.map(d => d.to?.runDetail).filter(Boolean) ?? [];

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
  const testConfigQuery = await apis.getParseQuery(false, `${APP_KEY}_TestConfig`);
  const globalConfig = await testConfigQuery
    .equalTo('global', true)
    .first({ ...ParseBaseQueryOptions, json: true });
  return globalConfig?.extra ?? {};
};

try {
  const planDetailsRel = await getTestEntityByRelation(
    PlanRelDetail,
    {
      from: testPlanIds,
    },
    {
      queryParams: {
        limit: 9999,
      },
      include: ['to.reference'],
      select: ['to.reference'],
    },
  );

  const planExecutionRel = await getTestEntityByRelation(
    PlanRelExecution,
    {
      from: testPlanIds,
    },
    {
      queryParams: {
        limit: 9999,
      },
      include: ['to.reference', 'from.reference'],
      select: ['to.reference', 'from.reference'],
    },
  );

  const executionRunRel = await getTestEntityByRelation(
    ExecutionRelRun,
    {
      from: planExecutionRel.map(d => d.to?.objectId).filter(Boolean),
    },
    {
      queryParams: {
        limit: 9999,
      },
      include: [
        'sortIndex',
        'to.runReferenceDetail',
        'to.runReferenceDetail.reference',
        'to.runDetail',
      ],
      select: [
        'sortIndex',
        'to.runReferenceDetail',
        'to.runReferenceDetail.reference',
        'to.runDetail',
      ],
    },
  );

  const globalConfig = await getGlobalConfig();

  const defectItem = await getDefectItem(getDefectId(executionRunRel), {
    queryParams: {
      limit: 9999,
    },
  });

  const testRuns = getToByFrom(executionRunRel, 'testRuns');
  const testExecution = getToByFrom(planExecutionRel, 'testExecutions', true);

  // const planStats = planId.reduce((prev, cur) => {
  //   if (cur) {
  //     prev = {
  //       [cur]: {
  //         ...getToByFrom(planDetailsRel, 'allTestCases')[cur],
  //         reference: testExecution[cur]?.reference,
  //         testExecutions: testExecution[cur]?.testExecutions.map(d => ({
  //           ...d,
  //           testRun: testRuns[d.objectId]?.testRuns ?? [],
  //         })),
  //         defects: defectItem,
  //       },
  //     };
  //   }
  //   return prev;
  // }, {});

  const planStats = testPlanIds.map(planId => ({
    key: planId,
    ...getToByFrom(planDetailsRel, 'allTestCases')[planId],
    reference: testExecution[planId]?.reference,
    testExecutions: testExecution[planId]?.testExecutions.map(d => ({
      ...d,
      testRun: testRuns[d.objectId]?.testRuns ?? [],
    })),
    defects: defectItem,
  }));

  return {
    planStats,
    globalConfig,
  };
} catch (err) {
  console.error('report stats error', err);
  return [];
}
=======
/**
 * @file 测试管理报表统计数据
 * @prams {Array} testPlanIds 测试计划 Ids
 * */

const APP_KEY = global.appKey ?? 'test_manager';

const testPlanIds = global?.body?.testPlanIds ?? [];

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};

const ExecutionRelRun = 'ExecutionRelRun';
const PlanRelExecution = 'PlanRelExecution';
const PlanRelDetail = 'PlanRelDetail';

const defaultConfig = {
  // 响应数据处理
  include: [],
  select: [],
  nameLike: '',
  workspaceKey: '',
  // 需要关联方 id
  needOriginSideId: true,
  // 需要关联关系数据
  needRelationData: true,
  ascendingBy: ['sortIndex', 'createdAt'],
  descendingBy: [],
  resultTransfer: data => data,
  queryParams: {
    limit: 10,
    offset: 0,
  },
};

const hasArrayItem = arr => Boolean(Array.isArray(arr) && arr.length);

const getRelationKey = side => Object.keys(side).filter(Boolean)[0];

const getTestEntityByRelation = async (relType, side, _config = {}) => {
  const testRelationQuery = await apis.getParseQuery(false, `${APP_KEY}_TestRelation`);
  const relKey = getRelationKey(side);
  const originalIds = side[relKey].filter(Boolean).map(item => item?.objectId ?? item);
  const config = Object.assign({}, defaultConfig, _config);
  const { include, select } = config;

  testRelationQuery.equalTo('relationType', relType).containedIn(relKey, originalIds);

  if (hasArrayItem(include)) {
    testRelationQuery.include(include);
  }

  if (hasArrayItem(select)) {
    testRelationQuery.include(select);
  }

  if (config.queryParams && typeof config.queryParams === 'object') {
    const { queryParams } = config;
    testRelationQuery.limit(queryParams.limit ?? 10);
    testRelationQuery.skip(queryParams.offset ?? 0);
  }

  const data = await testRelationQuery.find(ParseBaseQueryOptions);

  return data?.map(test => test.toJSON()) ?? [];
};

const getDefectItem = async (ids, config = {}) => {
  const itemQuery = await apis.getParseQuery(false, 'Item');

  itemQuery.containedIn('objectId', ids);

  if (config.workspace) {
    itemQuery.equalTo('workspace', config.workspace);
  }

  if (hasArrayItem(config.include)) {
    itemQuery.include(config.include);
  }

  if (hasArrayItem(config.select)) {
    itemQuery.include(config.select);
  }

  if (config.queryParams && typeof config.queryParams === 'object') {
    const { queryParams } = config;
    itemQuery.limit(queryParams.limit ?? 10);
    itemQuery.skip(queryParams.offset ?? 0);
  }

  const data = await itemQuery.find(ParseBaseQueryOptions);

  return data?.map(item => item.toJSON()) ?? [];
};

const getToByFrom = (datas, filed, isHanleRef = false) =>
  (datas ?? []).reduce((prev, cur) => {
    if (!prev[cur.from.objectId]?.reference && isHanleRef) {
      prev = {
        ...prev,
        [cur.from.objectId]: {
          ...(prev[cur.from.objectId] ?? {}),
          reference: cur.from.reference,
        },
      };
    }

    if (cur.from.objectId) {
      prev = {
        ...prev,
        [cur.from.objectId]: {
          ...(prev[cur.from.objectId] ?? {}),
          [filed]: (prev[cur.from.objectId]?.[filed] ?? []).concat(cur.to),
        },
      };
    }

    return prev;
  }, {});

const getDefectId = datas => {
  const runDetails = datas?.map(d => d.to?.runDetail).filter(Boolean) ?? [];

  const stepDefectIds = runDetails
    .filter(d => d?.steps)
    .map(d => d.steps)
    .flat()
    .map(d => d.defectItemIds ?? [])
    .flat()
    .filter(Boolean);
  const runDefectItemIds = runDetails
    .map(d => d?.defectItemIds ?? [])
    .flat()
    .filter(Boolean);
  return [...stepDefectIds, ...runDefectItemIds];
};

/** 获取全局配置文件 */
const getGlobalConfig = async () => {
  const testConfigQuery = await apis.getParseQuery(false, `${APP_KEY}_TestConfig`);
  const globalConfig = await testConfigQuery
    .equalTo('global', true)
    .first({ ...ParseBaseQueryOptions, json: true });
  return globalConfig?.extra ?? {};
};

try {
  const planDetailsRel = await getTestEntityByRelation(
    PlanRelDetail,
    {
      from: testPlanIds,
    },
    {
      queryParams: {
        limit: 9999,
      },
      include: ['to.reference'],
      select: ['to.reference'],
    },
  );

  const planExecutionRel = await getTestEntityByRelation(
    PlanRelExecution,
    {
      from: testPlanIds,
    },
    {
      queryParams: {
        limit: 9999,
      },
      include: ['to.reference', 'from.reference'],
      select: ['to.reference', 'from.reference'],
    },
  );

  const executionRunRel = await getTestEntityByRelation(
    ExecutionRelRun,
    {
      from: planExecutionRel.map(d => d.to?.objectId).filter(Boolean),
    },
    {
      queryParams: {
        limit: 9999,
      },
      include: [
        'sortIndex',
        'to.runReferenceDetail',
        'to.runReferenceDetail.reference',
        'to.runDetail',
      ],
      select: [
        'sortIndex',
        'to.runReferenceDetail',
        'to.runReferenceDetail.reference',
        'to.runDetail',
      ],
    },
  );

  const globalConfig = await getGlobalConfig();

  const defectItem = await getDefectItem(getDefectId(executionRunRel), {
    queryParams: {
      limit: 9999,
    },
  });

  const testRuns = getToByFrom(executionRunRel, 'testRuns');
  const testExecution = getToByFrom(planExecutionRel, 'testExecutions', true);

  // const planStats = planId.reduce((prev, cur) => {
  //   if (cur) {
  //     prev = {
  //       [cur]: {
  //         ...getToByFrom(planDetailsRel, 'allTestCases')[cur],
  //         reference: testExecution[cur]?.reference,
  //         testExecutions: testExecution[cur]?.testExecutions.map(d => ({
  //           ...d,
  //           testRun: testRuns[d.objectId]?.testRuns ?? [],
  //         })),
  //         defects: defectItem,
  //       },
  //     };
  //   }
  //   return prev;
  // }, {});

  const planStats = testPlanIds.map(planId => ({
    key: planId,
    ...getToByFrom(planDetailsRel, 'allTestCases')[planId],
    reference: testExecution[planId]?.reference,
    testExecutions: testExecution[planId]?.testExecutions.map(d => ({
      ...d,
      testRun: testRuns[d.objectId]?.testRuns ?? [],
    })),
    defects: defectItem,
  }));

  return {
    planStats,
    globalConfig,
  };
} catch (err) {
  console.error('report stats error', err);
  return [];
}
>>>>>>> ffabe21c1180849e4eb80af865bd4f13ab2bd7d4:trigger/webTrigger/report/stats.js
